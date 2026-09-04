import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { loadEnvConfig } from '../../config/env.js';

export interface StorageUploadUrlResult {
  uploadUrl: string;
  publicUrl: string;
  objectKey: string;
  expiresInSeconds: number;
}

export class R2StorageService {
  private static client: S3Client | null = null;

  private static isRealCredentials(): boolean {
    const env = loadEnvConfig();
    return Boolean(
      env.R2_ACCESS_KEY_ID &&
        env.R2_SECRET_ACCESS_KEY &&
        !env.R2_ACCESS_KEY_ID.startsWith('r2_') &&
        !env.R2_SECRET_ACCESS_KEY.startsWith('r2_')
    );
  }

  private static getClient(): S3Client | null {
    const env = loadEnvConfig();
    if (!R2StorageService.isRealCredentials()) {
      return null;
    }

    if (!R2StorageService.client) {
      const endpoint =
        env.R2_ENDPOINT && !env.R2_ENDPOINT.startsWith('r2_')
          ? env.R2_ENDPOINT
          : env.R2_ACCOUNT_ID && !env.R2_ACCOUNT_ID.startsWith('r2_')
            ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
            : undefined;

      R2StorageService.client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
      });
    }

    return R2StorageService.client;
  }

  /**
   * Checks if live Cloudflare R2 credentials are configured in the environment.
   */
  static isConfigured(): boolean {
    return R2StorageService.isRealCredentials();
  }

  /**
   * Constructs server-authoritative public CDN URL for an object key.
   */
  static getPublicUrl(objectKey: string): string {
    const env = loadEnvConfig();
    const rawBaseUrl =
      env.R2_PUBLIC_BASE_URL && !env.R2_PUBLIC_BASE_URL.startsWith('r2_')
        ? env.R2_PUBLIC_BASE_URL
        : 'https://media.lankaeats.fi';
    const baseUrl = rawBaseUrl.replace(/\/+$/, '');
    const cleanKey = objectKey.replace(/^\/+/, '');
    return `${baseUrl}/${cleanKey}`;
  }

  /**
   * Generates presigned S3/R2 upload URL for browser direct-to-storage upload.
   */
  static async generateUploadUrl(
    objectKey: string,
    contentType: string,
    expiresInSeconds = 900
  ): Promise<StorageUploadUrlResult> {
    const env = loadEnvConfig();
    const client = R2StorageService.getClient();
    const publicUrl = R2StorageService.getPublicUrl(objectKey);

    if (!client) {
      // Synthetic signed URL for test/local environments
      const syntheticUrl = `${env.R2_PUBLIC_BASE_URL}/upload-mock/${encodeURIComponent(objectKey)}?token=mock_presigned_token`;
      return {
        uploadUrl: syntheticUrl,
        publicUrl,
        objectKey,
        expiresInSeconds,
      };
    }

    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: objectKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });

    return {
      uploadUrl,
      publicUrl,
      objectKey,
      expiresInSeconds,
    };
  }

  /**
   * Directly uploads buffer object to Cloudflare R2 storage via server S3 client.
   */
  static async uploadBuffer(
    objectKey: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    const env = loadEnvConfig();
    const client = R2StorageService.getClient();
    const publicUrl = R2StorageService.getPublicUrl(objectKey);

    if (client) {
      const command = new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: objectKey,
        ContentType: contentType,
        Body: buffer,
      });
      await client.send(command);
    }

    return publicUrl;
  }

  /**
   * Deletes object from Cloudflare R2 storage.
   */
  static async deleteObject(objectKey: string): Promise<boolean> {
    const env = loadEnvConfig();
    const client = R2StorageService.getClient();
    if (!client) {
      return true; // Mock success for local dev / tests
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: objectKey,
      });
      await client.send(command);
      return true;
    } catch {
      return false;
    }
  }
}
