import { Request, Response } from 'express';
import fs from 'fs';
import * as util from 'util';

import winston from 'winston';
import { HTTPError } from '../types/errors';
import * as process from "process";
import {cleanUserObject} from "../util/cleanUserObject";

const maxMessageSize = 50000; // Cap is 64KB, so we're going a bit lower to be safe

// Courtesy of https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value#examples
export const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key: any, value: any) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    return value;
  };
};

export const jsonify = (message: any) => {
  return JSON.stringify(message, getCircularReplacer(), 2);
};

const prepareMessage = function(args: any) {
  const msg = args.map((e: any) => {
    if (e === undefined || e === null) {
      return String(e);
    }

    if (e.toString() === '[object FileList]')
      return util.inspect(e.toArray(), false, 10);
    else if (e.toString() === '[object File]')
      return util.inspect(e.toObject(), false, 10);
    else if (e.toString() === '[object Object]') {
      return util.inspect(e, false, 5);
    } else if (e instanceof Error)
      return e.stack;
    else
      return e;
  }).join(' ');

  // We will truncate the message if we reach the stackdriver limit
  const uint8 = new TextEncoder().encode(msg);
  const messageSize = uint8.length;

  if (messageSize > maxMessageSize) {
    console.log(`Truncating message of length ${messageSize}`);

    // We'll write any overflow messages to disk
    fs.appendFile('logs/truncated.log', `${new Date()} ${msg}\n`, function(err) {
      if (err) {
        console.log(`Error writing truncated message: ${err}`);
      }
    });

    const truncatedSection = uint8.slice(0, maxMessageSize);
    return `[TRUNCATED!] ${new TextDecoder('utf-8').decode(truncatedSection)}`;
  }

  return msg;
};

const cFormat = winston.format.printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] [${level.toUpperCase()}]: ${message}`;
});

function createWinstonLogger() {
  const levels = {
    error: 0,
    warn: 1,
    info: 2,
    verbose: 3,
    debug: 4,
    silly: 5,
  };

  const loggingFormat = winston.format.combine(winston.format.timestamp(), winston.format.label({ label: 'HT6-BACKEND' }), cFormat);

  const logger = winston.createLogger({
    level: 'info',
    format: loggingFormat,
    defaultMeta: { service: 'user-service' },
    transports: [
      //
      // - Write to all logs with level `info` and below to `combined.log`
      // - Write all logs error (and below) to `error.log`.
      //
      // new winston.transports.File({
      //   filename: 'logs/error.log',
      //   level: 'error',
      //   handleExceptions: true,
      // }),
      // new winston.transports.File({ filename: 'logs/combined.log' }),
    ],//,
    // exceptionHandlers: [
    //     new winston.transports.File({ filename: 'exceptions.log' }),
    //     loggingWinston
    // ]
  });
  winston.loggers.add('default', logger);
  //
  // If we're not in production then log to the `console` with the format:
  // `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
  //
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: loggingFormat,
      level: process.env.LOG_LEVEL || 'silly',
      handleExceptions: true,
    }));
  }

  // Log to stdout at log level info in production
  if (process.env.NODE_ENV === 'production') {
    logger.add(new winston.transports.Console({
      format: loggingFormat,
      level: process.env.LOG_LEVEL || 'info',
      handleExceptions: true,
    }));


  }
  return logger;
}

export function logRequest(req: Request, alwaysLog?: boolean, additional?: any):void {
  const logPayload = jsonify({
    requestURL: req.url,
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    uid: req.executor?._id || 'N/A',
    requestBody: req.body,
    executorUser: cleanUserObject(req.executor),
    ...(additional !== undefined ? additional : {})
  });

  if (process.env.NODE_ENV === 'development') {
    log.debug(`[${req.method} ${req.url}]`, logPayload);
  } else if (alwaysLog) {
    log.info(`[${req.method} ${req.url}]`, logPayload);
  }
}

/**
 * Handles the promise from APIs calls and handles errors, or forwards data for a successful req.
 *
 * @param req
 * @param res
 * @param promise
 * @param alwaysLog - when enabled, this event will trigger an info level log in production
 */
export const logResponse = (req: Request, res: Response, promise: Promise<any>, alwaysLog?: boolean, excludeData?: boolean) => {
  promise
  .then((data) => {

    logRequest(req, alwaysLog, {
      responseBody: data,
    });

    return res.json({
      status: 200,
      message: data,
    });
  })
  .catch((error: HTTPError) => {
    const status = error.status || 500;

    // When we send out the response, we do NOT send the full error by default for security
    const body: any = {
      status: status,
    };

    if (error instanceof HTTPError || req?.executor?.roles?.organizer) {
      body.message = error.publicMessage;
    } else {
      body.message = 'An error occurred';
    }

    if (req?.executor?.roles?.organizer || error.errorIsPublic) {
      body.error = error.error;
    }

    const logPayload = jsonify({
      requestURL: req.url,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      uid: req.executor?._id || 'N/A',
      requestBody: req.body,
      error: error,
      responseBody: body,
      executorUser: cleanUserObject(req.executor),
    });

    log.error(`[${req.method} ${req.url}]`, logPayload);

    return res.status(status).json(body);
  });

};

export const winstonLogger = createWinstonLogger();

const logLevels = ['error', 'warn', 'info', 'verbose', 'debug', 'silly'];
type logLevels = 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly';

const logFunctions = {} as Record<logLevels, (...args: any) => void>;

for (const logLevel of logLevels) {
  logFunctions[logLevel as logLevels] = (...args: any) => {
    winstonLogger.log(logLevel, prepareMessage(args));
  };
}

export const log = logFunctions;
