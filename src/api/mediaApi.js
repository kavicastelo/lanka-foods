import { apiClient } from './apiClient';

export const mediaApi = {
  async requestUploadUrl({ category, fileName, fileType, fileSize, restaurantId }) {
    const res = await apiClient.post('/api/media/upload-url', {
      category,
      fileName,
      fileType,
      fileSize,
      restaurantId,
    });
    return res;
  },

  async uploadDirectToStorage(uploadUrl, file, fileType) {
    // Direct upload from browser to Cloudflare R2 presigned URL
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': fileType,
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Media upload failed with status ${response.status}`);
    }

    return true;
  },

  async deleteMedia(objectKey, restaurantId = null) {
    const res = await apiClient.delete('/api/media', {
      data: { objectKey, restaurantId },
    });
    return res;
  },
};
