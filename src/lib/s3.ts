import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// S3 client singleton
const s3 = new S3Client({
  endpoint: process.env.BUCKET_ENDPOINT,
  region: "auto",
  credentials: {
    accessKeyId: process.env.BUCKET_ACCESS_KEY!,
    secretAccessKey: process.env.BUCKET_SECRET_KEY!,
  },
  forcePathStyle: true, // Required for most S3-compatible services
})

const BUCKET_NAME = process.env.BUCKET_NAME!

/**
 * Generate a presigned URL for uploading a file
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600 // 1 hour default
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  })

  return getSignedUrl(s3, command, { expiresIn })
}

/**
 * Generate a presigned URL for downloading a file
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 3600 // 1 hour default
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  return getSignedUrl(s3, command, { expiresIn })
}

/**
 * Delete an object from S3
 */
export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  await s3.send(command)
}

/**
 * Generate a unique S3 key for a document
 */
export function generateDocumentKey(
  entityId: string, // packageId or assetId
  category: string,
  filename: string
): string {
  const uuid = crypto.randomUUID()
  // Sanitize filename - remove special characters but keep extension
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_")
  return `documents/${entityId}/${category}/${uuid}/${sanitized}`
}

export { s3, BUCKET_NAME }
