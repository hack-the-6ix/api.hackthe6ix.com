import 'dotenv/config';
import * as OpenTelemetry from './tracing';

OpenTelemetry.init('ht6-backend')

import * as Sentry from '@sentry/node';
import '@sentry/tracing';
import bodyParser from 'body-parser';
import cors from 'cors';
import express, { ErrorRequestHandler } from 'express';
import 'express-async-errors';
import fileUpload from 'express-fileupload';
// Bootstrap scripts
import './bootstrap/settings';
import { port } from './consts';
import actionRouter from './routes/action';
import apiRouter from './routes/api';
import authRouter from './routes/auth';
import { logResponse } from './services/logger';
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

app.use(function(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
  logResponse(req, res, (
    async () => {
      throw new InternalServerError('An error occurred', err.stack);
    }
  )());
} as ErrorRequestHandler);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

console.log(`Node Environment: ${process.env.NODE_ENV}`);
