/**
 * Primary APIs (basically model independent)
 *
 * For more model dependent endpoints, see actions.ts
 */

import express, { Request, Response } from 'express';
import {
  readBlob,
  writeBlob,
  deleteBlob,
  getBlobDownloadUrl,
  getBlobUploadUrl,
} from '../controller/AzureBlobStorageController';
import {
  createObject,
  deleteObject,
  editObject,
  getObject,
  getObjectV2
} from '../controller/ModelController';
import { logRequest, logResponse } from '../services/logger';
import { isAdmin, isOrganizer } from '../services/permissions';
import { SystemBlobContainer } from '../services/azureBlobStorage';

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
 * Get file from Azure Blob Storage (direct download)
 */
apiRouter.get('/blob', isOrganizer, async (req: Request, res: Response) => {
  try {
    // since we're returning a binary, don't log it directly
    await readBlob(
      req.query.container as SystemBlobContainer,
      req.query.blobName as string,
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
 * Get presigned download URL for Azure Blob Storage
 */
apiRouter.get('/blob/download-url', isOrganizer, (req: Request, res: Response) => {
  const expiresInMinutes = req.query.expiresInMinutes ? parseInt(req.query.expiresInMinutes as string) : 60;
  
  logResponse(
    req,
    res,
    getBlobDownloadUrl(
      req.query.container as SystemBlobContainer,
      req.query.blobName as string,
      expiresInMinutes,
    ),
  );
});

/**
 * (Organizer)
 *
 * Upload file to Azure Blob Storage (direct upload)
 */
apiRouter.put('/blob', isOrganizer, (req: Request, res: Response) => {
  const fileData = (req as any)?.files?.file?.data;
  const contentType = (req as any)?.files?.file?.mimetype;
  
  logResponse(
    req,
    res,
    writeBlob(
      req.query.container as SystemBlobContainer,
      req.query.blobName as string,
      fileData,
      contentType,
    ),
    true,
  );
});

/**
 * (Organizer)
 *
 * Get presigned upload URL for Azure Blob Storage
 */
apiRouter.get('/blob/upload-url', isOrganizer, (req: Request, res: Response) => {
  const expiresInMinutes = req.query.expiresInMinutes ? parseInt(req.query.expiresInMinutes as string) : 60;
  
  logResponse(
    req,
    res,
    getBlobUploadUrl(
      req.query.container as SystemBlobContainer,
      req.query.blobName as string,
      expiresInMinutes,
    ),
  );
});

/**
 * (Organizer)
 *
 * Delete blob from Azure Blob Storage
 */
apiRouter.delete('/blob', isOrganizer, (req: Request, res: Response) => {
  logResponse(
    req,
    res,
    deleteBlob(
      req.query.container as SystemBlobContainer,
      req.query.blobName as string,
    ),
    true,
  );
});

export default apiRouter;
