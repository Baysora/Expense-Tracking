import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from "@azure/storage-blob";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME ?? "expense-attachments";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/tiff",
  "image/gif",
  "image/bmp",
  "application/pdf",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType);
}

export function isAllowedFileSize(sizeBytes: number): boolean {
  return sizeBytes <= MAX_FILE_SIZE;
}

function getClient(): BlobServiceClient {
  return BlobServiceClient.fromConnectionString(connectionString);
}

export async function uploadBlob(
  opCoId: string,
  expenseId: string,
  originalFileName: string,
  data: Buffer,
  mimeType: string
): Promise<{ blobName: string }> {
  const ext = path.extname(originalFileName).toLowerCase() || ".bin";
  const blobName = `${opCoId}/${expenseId}/${uuidv4()}${ext}`;

  const client = getClient();
  const containerClient = client.getContainerClient(containerName);
  await containerClient.createIfNotExists();

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(data, {
    blobHTTPHeaders: { blobContentType: mimeType },
  });

  return { blobName };
}

export async function generateSasUrl(blobName: string, expiryMinutes = 60): Promise<string> {
  const client = getClient();
  const containerClient = client.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);

  // For connection string auth, get SAS via blob client
  const expiresOn = new Date();
  expiresOn.setMinutes(expiresOn.getMinutes() + expiryMinutes);

  const sasUrl = await blobClient.generateSasUrl({
    permissions: BlobSASPermissions.parse("r"),
    expiresOn,
  });

  return sasUrl;
}

export async function deleteBlob(blobName: string): Promise<void> {
  const client = getClient();
  const containerClient = client.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);
  await blobClient.deleteIfExists();
}
