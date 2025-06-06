import { BlobServiceClient, ContainerClient, BlockBlobClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } from '@azure/storage-blob';
import { BadRequestError } from '../types/errors';

// Define the containers we support (similar to GridFS buckets)
export const BLOB_CONTAINERS = ['resumes'] as const;
export type SystemBlobContainer = typeof BLOB_CONTAINERS[number];

let blobServiceClient: BlobServiceClient | null = null;
const containerCache: Record<string, ContainerClient> = {};
const containersSet = new Set(BLOB_CONTAINERS);

// Initialize the Azure Blob Service Client
export function initializeBlobService(connectionString?: string) {
  if (!connectionString) {
    throw new Error('Azure Storage connection string is required');
  }
  
  blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
}

// Get or create a container client
export function getContainerClient(containerName: SystemBlobContainer): ContainerClient {
  if (!containersSet.has(containerName)) {
    throw new BadRequestError(`Invalid blob container: ${containerName}`);
  }
  
  if (!blobServiceClient) {
    throw new Error('Blob service client not initialized. Call initializeBlobService first.');
  }
  
  if (containerCache[containerName] === undefined) {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    containerCache[containerName] = containerClient;
  }
  
  return containerCache[containerName];
}

// Ensure container exists (create if it doesn't)
export async function ensureContainerExists(containerName: SystemBlobContainer): Promise<void> {
  const containerClient = getContainerClient(containerName);
  await containerClient.createIfNotExists();
}

// Generate a presigned URL for uploading
export function generateUploadPresignedUrl(containerName: SystemBlobContainer, blobName: string, expiresInMinutes = 60): string {
  if (!blobServiceClient) {
    throw new Error('Blob service client not initialized');
  }
  
  const containerClient = getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
  // Check if we have the right credential type for SAS
  if (!(blobServiceClient.credential instanceof StorageSharedKeyCredential)) {
    throw new Error('SAS generation requires StorageSharedKeyCredential');
  }
  
  const sasOptions = {
    containerName,
    blobName,
    permissions: BlobSASPermissions.parse('w'), // Write permission
    startsOn: new Date(),
    expiresOn: new Date(new Date().valueOf() + expiresInMinutes * 60 * 1000),
  };
  
  // Generate SAS token
  const sasToken = generateBlobSASQueryParameters(sasOptions, blobServiceClient.credential as StorageSharedKeyCredential).toString();
  
  return `${blockBlobClient.url}?${sasToken}`;
}

// Generate a presigned URL for downloading
export function generateDownloadPresignedUrl(containerName: SystemBlobContainer, blobName: string, expiresInMinutes = 60): string {
  if (!blobServiceClient) {
    throw new Error('Blob service client not initialized');
  }
  
  const containerClient = getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
  // Check if we have the right credential type for SAS
  if (!(blobServiceClient.credential instanceof StorageSharedKeyCredential)) {
    throw new Error('SAS generation requires StorageSharedKeyCredential');
  }
  
  const sasOptions = {
    containerName,
    blobName,
    permissions: BlobSASPermissions.parse('r'), // Read permission
    startsOn: new Date(),
    expiresOn: new Date(new Date().valueOf() + expiresInMinutes * 60 * 1000),
  };
  
  // Generate SAS token
  const sasToken = generateBlobSASQueryParameters(sasOptions, blobServiceClient.credential as StorageSharedKeyCredential).toString();
  
  return `${blockBlobClient.url}?${sasToken}`;
}

// Get blob service client (for direct access when needed)
export function getBlobServiceClient(): BlobServiceClient {
  if (!blobServiceClient) {
    throw new Error('Blob service client not initialized');
  }
  return blobServiceClient;
} 