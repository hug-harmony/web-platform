import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Types
export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

export interface S3File {
  key: string;
  size?: number;
  lastModified?: Date;
  url: string;
}

// Environment variables
const AWS_REGION = process.env.REGION || process.env.AWS_REGION;
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

function validateConfig() {
  const missing: string[] = [];

  if (!AWS_REGION) missing.push("REGION or AWS_REGION");
  if (!BUCKET_NAME) missing.push("S3_BUCKET_NAME");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

// Initialize S3 Client - credentials will be auto-resolved from:
// 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
// 2. Shared credentials file (~/.aws/credentials)
// 3. ECS container credentials
// 4. EC2/ECS instance metadata (IAM role)
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    validateConfig();

    // Check if explicit credentials are provided, otherwise let SDK auto-resolve
    const hasExplicitCredentials =
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

    const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
      region: AWS_REGION,
    };

    // Only add explicit credentials if provided
    if (hasExplicitCredentials) {
      clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      };
    }

    s3Client = new S3Client(clientConfig);
  }
  return s3Client;
}

// Generate public URL for an object
export function getPublicUrl(key: string): string {
  return `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}

// Upload file to S3
export async function uploadToS3(
  file: File | Buffer,
  key: string,
  contentType?: string
): Promise<UploadResult> {
  const client = getS3Client();

  let body: Buffer;
  let type: string;

  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    body = Buffer.from(arrayBuffer);
    type = contentType || file.type;
  } else {
    body = file;
    type = contentType || "application/octet-stream";
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: type,
  });

  await client.send(command);

  return {
    url: getPublicUrl(key),
    key,
    bucket: BUCKET_NAME!,
  };
}

// Upload with random suffix
export async function uploadToS3WithRandomSuffix(
  file: File,
  prefix: string = ""
): Promise<UploadResult> {
  const extension = file.name.split(".").pop() || "";
  const randomId = crypto.randomUUID();
  const key = prefix
    ? `${prefix}/${randomId}${extension ? `.${extension}` : ""}`
    : `${randomId}${extension ? `.${extension}` : ""}`;

  return uploadToS3(file, key, file.type);
}

// Get signed URL for private files
export async function getSignedFileUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(client, command, { expiresIn });
}

// Get signed URL for uploads
export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(client, command, { expiresIn });
}

// List files in S3
export async function listFiles(prefix: string = ""): Promise<S3File[]> {
  const client = getS3Client();

  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
  });

  const response = await client.send(command);

  return (
    response.Contents?.map((item) => ({
      key: item.Key!,
      size: item.Size,
      lastModified: item.LastModified,
      url: getPublicUrl(item.Key!),
    })) || []
  );
}

// Delete file from S3
export async function deleteFromS3(key: string): Promise<void> {
  const client = getS3Client();

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await client.send(command);
}

// Delete file by URL
export async function deleteFromS3ByUrl(url: string): Promise<void> {
  const key = extractKeyFromUrl(url);
  if (key) {
    await deleteFromS3(key);
  }
}

// Extract key from S3 URL
export function extractKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes(BUCKET_NAME!)) {
      return urlObj.pathname.slice(1);
    } else {
      const parts = urlObj.pathname.split("/");
      if (parts[1] === BUCKET_NAME) {
        return parts.slice(2).join("/");
      }
    }
    return urlObj.pathname.slice(1);
  } catch {
    return null;
  }
}

// Check if file exists
export async function fileExists(key: string): Promise<boolean> {
  const client = getS3Client();

  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    await client.send(command);
    return true;
  } catch {
    return false;
  }
}

export { BUCKET_NAME };
