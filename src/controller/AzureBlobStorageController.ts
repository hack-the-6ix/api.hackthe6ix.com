import { Writable, PassThrough } from 'stream';
import { pipeline } from 'stream/promises';
import { BadRequestError, NotFoundError } from '../types/errors';
import archiver from 'archiver';
import {
  getContainerClient,
  ensureContainerExists,
  generateUploadPresignedUrl,
  generateDownloadPresignedUrl,
  SystemBlobContainer
} from '../services/azureBlobStorage';

/**
 * Reads a blob from Azure Blob Storage and pipes it to the express response
 *
 * @param containerName
 * @param blobName
 * @param outputStream
 */
export const readBlob = async (containerName: SystemBlobContainer, blobName: string, outputStream: Writable): Promise<string> => {
  if (!blobName || blobName.length === 0) {
    throw new BadRequestError('Invalid blob name!');
  }

  const containerClient = getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  try {
    // Check if blob exists
    const exists = await blockBlobClient.exists();
    if (!exists) {
      throw new NotFoundError(`Blob ${blobName} not found`);
    }

    // Download and pipe to output stream
    const downloadResponse = await blockBlobClient.download();
    if (!downloadResponse.readableStreamBody) {
      throw new Error('Failed to get readable stream from blob');
    }

    await pipeline(downloadResponse.readableStreamBody, outputStream);
    return 'Success';
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new Error(`Failed to read blob: ${error}`);
  }
};

/**
 * Generates a presigned URL for downloading a blob
 *
 * @param containerName
 * @param blobName
 * @param expiresInMinutes
 */
export const getBlobDownloadUrl = async (containerName: SystemBlobContainer, blobName: string, expiresInMinutes: number = 60): Promise<string> => {
  if (!blobName || blobName.length === 0) {
    throw new BadRequestError('Invalid blob name!');
  }

  const containerClient = getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  // Check if blob exists
  const exists = await blockBlobClient.exists();
  if (!exists) {
    throw new NotFoundError(`Blob ${blobName} not found`);
  }

  return generateDownloadPresignedUrl(containerName, blobName, expiresInMinutes);
};

/**
 * Uploads a file to Azure Blob Storage (proxy method)
 *
 * @param containerName
 * @param blobName
 * @param fileData
 * @param contentType
 */
export const writeBlob = async (containerName: SystemBlobContainer, blobName: string, fileData: Buffer, contentType?: string): Promise<string> => {
  if (!blobName || blobName.length === 0) {
    throw new BadRequestError('Invalid blob name!');
  }

  // Ensure container exists
  await ensureContainerExists(containerName);

  const containerClient = getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  try {
    // Upload the blob
    const uploadOptions = {
      blobHTTPHeaders: contentType ? { blobContentType: contentType } : undefined,
    };

    await blockBlobClient.upload(fileData, fileData.length, uploadOptions);
    return 'Success';
  } catch (error) {
    throw new Error(`Failed to upload blob: ${error}`);
  }
};

/**
 * Generates a presigned URL for uploading a blob
 *
 * @param containerName
 * @param blobName
 * @param expiresInMinutes
 */
export const getBlobUploadUrl = async (containerName: SystemBlobContainer, blobName: string, expiresInMinutes: number = 60): Promise<string> => {
  if (!blobName || blobName.length === 0) {
    throw new BadRequestError('Invalid blob name!');
  }

  // Ensure container exists
  await ensureContainerExists(containerName);

  return generateUploadPresignedUrl(containerName, blobName, expiresInMinutes);
};

/**
 * Deletes a blob from Azure Blob Storage
 *
 * @param containerName
 * @param blobName
 */
export const deleteBlob = async (containerName: SystemBlobContainer, blobName: string): Promise<string> => {
  if (!blobName || blobName.length === 0) {
    throw new BadRequestError('Invalid blob name!');
  }

  const containerClient = getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  try {
    // Check if blob exists
    const exists = await blockBlobClient.exists();
    if (!exists) {
      throw new NotFoundError(`Blob ${blobName} not found`);
    }

    // Delete the blob
    await blockBlobClient.delete();
    return 'Success';
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new Error(`Failed to delete blob: ${error}`);
  }
};

/**
 * Reads multiple blobs and pipes them to a Writable as a ZIP
 *
 * @param containerName
 * @param blobData
 * @param outputStream
 */
export const exportBlobsAsZip = async (
  containerName: SystemBlobContainer,
  blobData: { blobname: string; filename: string }[],
  outputStream: Writable
): Promise<void> => {
  const containerClient = getContainerClient(containerName);

  // Check if all blobs exist
  const existsChecks = blobData.map(async ({ blobname }) => {
    const blockBlobClient = containerClient.getBlockBlobClient(blobname);
    const exists = await blockBlobClient.exists();
    if (!exists) {
      throw new NotFoundError(`Blob ${blobname} not found`);
    }
    return blockBlobClient;
  });

  const blobClients = await Promise.all(existsChecks);

  return new Promise<void>((resolve, reject) => {
    const archive = archiver('zip', {
      zlib: { level: 0 } // Don't compress to save CPU
    });

    outputStream.on('end', () => {
      resolve();
    });

    archive.on('warning', (err: any) => {
      if (err.code === 'ENOENT') {
        // log warning
        console.warn('Archive warning:', err);
      } else {
        reject(err);
      }
    });

    archive.on('error', (err: any) => {
      reject(err);
    });

    archive.pipe(outputStream);

    // Add each blob to the archive
    const downloadPromises = blobClients.map(async (blobClient, index) => {
      const { filename } = blobData[index];
      const tStream = new PassThrough();
      
      archive.append(tStream, { name: filename });

      try {
        const downloadResponse = await blobClient.download();
        if (!downloadResponse.readableStreamBody) {
          throw new Error('Failed to get readable stream from blob');
        }

        downloadResponse.readableStreamBody.pipe(tStream);
      } catch (error) {
        tStream.destroy(error as Error);
      }
    });

    // Wait for all downloads to start, then finalize
    Promise.all(downloadPromises)
      .then(() => {
        archive.finalize();
      })
      .catch(reject);
  });
};

/**
 * Lists all blobs in a container with optional prefix filtering
 *
 * @param containerName
 * @param prefix
 */
export const listBlobs = async (containerName: SystemBlobContainer, prefix?: string): Promise<string[]> => {
  const containerClient = getContainerClient(containerName);

  try {
    const blobNames: string[] = [];
    const listBlobsOptions = prefix ? { prefix } : {};

    for await (const blob of containerClient.listBlobsFlat(listBlobsOptions)) {
      blobNames.push(blob.name);
    }

    return blobNames;
  } catch (error) {
    throw new Error(`Failed to list blobs: ${error}`);
  }
};

/**
 * Checks if a blob exists in the container
 *
 * @param containerName
 * @param blobName
 */
export const blobExists = async (containerName: SystemBlobContainer, blobName: string): Promise<boolean> => {
  if (!blobName || blobName.length === 0) {
    throw new BadRequestError('Invalid blob name!');
  }

  const containerClient = getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  try {
    return await blockBlobClient.exists();
  } catch (error) {
    throw new Error(`Failed to check blob existence: ${error}`);
  }
}; 