import express, { NextFunction, Request, Response, Router } from 'express';

import { logResponse } from '../services/logger';
import {
  handleCallback,
  handleLoginRequest,
  handleLogout,
  handleRefresh
} from '../controller/AuthController';

const router: Router = express.Router();

router.post('/:provider/callback', (req: Request, res: Response, next: NextFunction) => {
  logResponse(
      req,
      res,
      handleCallback(req.params.provider, req.body.code, req.body.state, req.body.callbackURL)
  )
});

router.post('/:provider/login', (req: Request, res: Response, next: NextFunction) => {
  logResponse(
      req,
      res,
      handleLoginRequest(req.params.provider, req.body.redirectTo, req.body.callbackURL)
  )
});

router.post('/:provider/refresh',  (req: Request, res: Response) => {
  logResponse(
      req,
      res,
      handleRefresh(req.params.provider, req.body.refreshToken)
  )
});

router.post('/:provider/logout', (req: Request, res: Response) => {
  logResponse(
    req,
    res,
    handleLogout(req.params.provider, req.body.refreshToken)
  )
});

export default router;
