import 'dotenv/config';
import * as OpenTelemetry from './tracing';

OpenTelemetry.init('ht6-backend')

import bodyParser from 'body-parser';
import cors from 'cors';
import express, { ErrorRequestHandler } from 'express';
import 'express-async-errors';
import fileUpload from 'express-fileupload';
import { port } from './consts';
import actionRouter from './routes/action';
import apiRouter from './routes/api';
import authRouter from './routes/auth';
import healthRouter from './routes/health';
import nfcRouter from './routes/nfc'

import { logResponse, log } from './services/logger';
import './services/environmentValidator';
import './services/mailer/util/verify_config';
import './services/mongoose_service';
import { InternalServerError } from './types/errors';

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const corsFilter = process.env.NODE_ENV === 'production'
    ? [/hackthe6ix\.com$/, /localhost:/]
    : '*';
app.use(cors({
  origin: corsFilter,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
}));

app.use(fileUpload({
  // We add one byte here so that all the excess data get truncated, but we can still trigger the filesize error in our code
  limits: { fileSize: 5000001 },
}));


app.use('/api', apiRouter);
app.use('/api/action', actionRouter);
app.use('/auth', authRouter);
app.use('/health', healthRouter);
app.use('/nfc', nfcRouter);

app.use(function(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
  logResponse(req, res, (
      async () => {
        throw new InternalServerError('An error occurred', err.stack);
      }
  )());
} as ErrorRequestHandler);

log.info(`Node Environment: ${process.env.NODE_ENV}`);
log.info("Waiting for MongoDB...")

app.listen(port, () => {
  log.info(`Server running on port ${port}`);
});

console.log(`Node Environment: ${process.env.NODE_ENV}`);