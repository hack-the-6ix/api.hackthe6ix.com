import { NextFunction, Request, Response } from 'express';
import { verify, decode, sign } from 'jsonwebtoken';
import APIToken from '../models/apitoken/APIToken';
import { IUser } from '../models/user/fields';
import User from '../models/user/User';
import ExternalUser from '../models/externaluser/ExternalUser';
import { ErrorMessage } from '../types/types';
import { jsonify, log } from './logger';
import { cleanUserObject } from '../util/cleanUserObject';

export const verifyToken = (token: string): Record<string, any> => {
  return verify(token, process.env.JWT_SECRET!, {
    algorithms: ['HS256'],
    issuer: 'hackthe6ix-backend',
  }) as Record<string, any>;
};

export const decodeToken = (token: string): Record<string, any> => {
  return decode(token) as Record<string, any>;
};

export const createJwt = (
  data: Record<string, unknown>,
  expiresIn?: '1 day' | '15 minutes',
): string => {
  return sign(data, process.env.JWT_SECRET!, {
    algorithm: 'HS256',
    expiresIn: expiresIn ?? '1 day',
    issuer: 'hackthe6ix-backend',
    audience: 'hackthe6ix-backend',
  });
};

export const authenticate = async (token: string): Promise<IUser | null> => {
  const tokenData = verifyToken(token);

  // Check if this is an OTP-authenticated external user
  if (tokenData.idpLinkID && tokenData.idpLinkID.startsWith('OTP-')) {
    const externalUserId = tokenData.idpLinkID.replace('OTP-', '');
    const externalUser = await ExternalUser.findById(externalUserId);

    if (externalUser) {
      // Convert ExternalUser to IUser format for compatibility
      return {
        ...externalUser.toObject(),
        roles: tokenData.roles || { volunteer: true },
        groups: { volunteer: true },
      } as IUser;
    }
  }

  // Regular user authentication
  const userInfo = (await User.findOne({
    idpLinkID: tokenData.idpLinkID,
  })) as IUser;

  if (userInfo && userInfo.lastLogout > tokenData.iat * 1000) {
    return null;
  }

  return userInfo;
};

export const getBearerToken = (
  header?: string | string[],
): string | boolean => {
  if (!header) {
    return false;
  }

  if (Array.isArray(header)) {
    header = header[0];
  }

  if (header.startsWith('Bearer ')) {
    return header.substring(7, header.length);
  } else {
    return false;
  }
};

export const getTokenFromHeader = (req: Request): string =>
  req['headers']['x-access-token'] ||
  getBearerToken(req['headers']['authorization']) ||
  req.body?.token;
export const getAPITokenFromHeader = (req: Request): string =>
  req['headers']['x-api-token'] as string;

/**
 * Returns  true iff login token is valid and was injected successfully
 */
export const injectExecutor = async (req: Request): Promise<boolean> => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      const apiToken = getAPITokenFromHeader(req);

      if (!apiToken) {
        return false;
      }

      const apiTokenInfo = await APIToken.findOne({
        token: apiToken,
      });

      if (!apiTokenInfo) {
        return false;
      }

      const user = await User.findOne({
        _id: apiTokenInfo.internalUserID,
      });

      if (!user) {
        return false;
      }

      req.executor = user;
    } else {
      const user = await authenticate(token);

      if (!user) {
        return false;
      }

      req.executor = user;
    }
  } catch (e) {
    return false;
  }

  return true;
};

const isRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
  role?: 'hacker' | 'volunteer' | 'organizer' | 'admin',
  authorizationCheck = true,
): Promise<Response | void> => {
  if (!(await injectExecutor(req))) {
    log.error(
      `[${req.method} ${req.url}] [INVALID TOKEN]`,
      jsonify({
        requestURL: req.url,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        uid: req.executor?._id || 'N/A',
        requestBody: req.body,
        role: role,
        responseBody: 'Invalid Token',
        executorUser: cleanUserObject(req.executor),
      }),
    );

    return res.status(401).send({
      message: 'Access Denied - Invalid Token',
      status: 401,
    } as ErrorMessage);
  }

  if (authorizationCheck && (!role || !req.executor?.roles[role])) {
    log.error(
      `[INSUFFICIENT PERMISSIONS]`,
      jsonify({
        requestURL: req.url,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        uid: req.executor?._id || 'N/A',
        requestBody: req.body,
        role: role,
        responseBody: 'Invalid Token',
        executorUser: cleanUserObject(req.executor),
      }),
    );

    return res.status(403).send({
      message: 'Access Denied - Insufficient permissions',
      status: 403,
    } as ErrorMessage);
  }

  next();
};

export const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  return isRole(req, res, next, undefined, false);
};

export const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  return isRole(req, res, next, 'admin');
};

export const isOrganizer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  return isRole(req, res, next, 'organizer');
};

export const isVolunteer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  return isRole(req, res, next, 'volunteer');
};

export const isHacker = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  return isRole(req, res, next, 'hacker');
};
