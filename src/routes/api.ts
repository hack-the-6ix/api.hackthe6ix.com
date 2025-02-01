/**
 * Primary APIs (basically model independent)
 *
 * For more model dependent endpoints, see actions.ts
 */

import express, { Request, Response } from 'express';
import {
  deleteGridFSFile,
  readGridFSFile,
  writeGridFSFile,
} from '../controller/GridFSController';
import {
  createObject,
  deleteObject,
  editObject,
  getObject,
  getObjectV2
} from '../controller/ModelController';
import { logRequest, logResponse } from '../services/logger';
import { mongoose } from '../services/mongoose_service';
import { isAdmin, isOrganizer } from '../services/permissions';
import { SystemGridFSBucket } from '../services/gridfs';

const apiRouter = express.Router();

apiRouter.use(express.json());

/**
 * (Organizer)
 *
 * Get the result of a search query for any object type.
 */
apiRouter.post(
  '/get/:objectType',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(
      req,
      res,
      getObject(req.executor!, req.params.objectType, req.body),
    );
  },
);

/**
 * (Organizer)
 *
 * VERSION 2: Get the result of a search query for any object type + returns total count
 */
apiRouter.post(
  '/get/v2/:objectType',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(
      req,
      res,
      getObjectV2(req.executor!, req.params.objectType, req.body),
    );
  },
);

/**
 * (Organizer)
 *
 * Edit object
 */
apiRouter.post(
  '/edit/:objectType',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(
      req,
      res,
      editObject(
        req.executor!,
        req.params.objectType,
        req.body.filter,
        req.body.changes,
        req.body.noFlatten,
        true,
      ),
      true,
    );
  },
);

/**
 * (Admin)
 *
 * Delete objects based on a query
 */
apiRouter.post(
  '/delete/:objectType',
  isAdmin,
  (req: Request, res: Response) => {
    logResponse(
      req,
      res,
      deleteObject(req.executor!, req.params.objectType, req.body),
      true,
    );
  },
);

/**
 * (Admin)
 *
 * Create object
 */
apiRouter.post(
  '/create/:objectType',
  isAdmin,
  (req: Request, res: Response) => {
    logResponse(
      req,
      res,
      createObject(req.executor!, req.params.objectType, req.body),
      true,
    );
  },
);

/**
 * (Organizer)
 *
 * Get file from GridFSS
 */
apiRouter.get('/gridfs', isOrganizer, async (req: Request, res: Response) => {
  try {
    // since we're returning a binary, don't log it direc
    await readGridFSFile(
      req.query.bucket as SystemGridFSBucket,
      req.query.filename as string,
      mongoose,
      res,
    );

    logRequest(req);
  } catch (e) {
    logResponse(
      req,
      res,
      (async () => {
        throw e;
      })(),
    );
  }
});

/**
 * (Organizer)
 *
 * Write file to GridFSS
 */
apiRouter.put('/gridfs', isOrganizer, (req: Request, res: Response) => {
  logResponse(
    req,
    res,
    writeGridFSFile(
      req.query.bucket as SystemGridFSBucket,
      req.query.filename as string,
      mongoose,
      (req as any)?.files?.file,
    ),
    true,
  );
});

/**
 * (Organizer)
 *
 * Delete file from GridFS
 */
apiRouter.delete('/gridfs', isOrganizer, (req: Request, res: Response) => {
  logResponse(
    req,
    res,
    deleteGridFSFile(
      req.query.bucket as SystemGridFSBucket,
      req.query.filename as string,
      mongoose,
    ),
    true,
  );
});

export default apiRouter;
