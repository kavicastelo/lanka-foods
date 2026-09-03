import type { StorageUploadUrlResult } from '../../infrastructure/storage/r2-client.js';

export interface UploadUrlResponseDto {
  uploadUrl: string;
  publicUrl: string;
  objectKey: string;
  expiresInSeconds: number;
}

export function toUploadUrlResponseDto(result: StorageUploadUrlResult): UploadUrlResponseDto {
  return {
    uploadUrl: result.uploadUrl,
    publicUrl: result.publicUrl,
    objectKey: result.objectKey,
    expiresInSeconds: result.expiresInSeconds,
  };
}
