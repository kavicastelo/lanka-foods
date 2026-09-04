import { apiClient } from './apiClient';

export const mediaApi = {
  async requestUploadUrl({ category, fileName, fileType, fileSize, restaurantId }) {
    const res = /** @type {any} */ (await apiClient.post('/api/media/upload-url', {
      category,
      fileName,
      fileType,
      fileSize,
      restaurantId,
    }));
    return res.data || res;
  },

  async uploadMediaServerProxy(data) {
    const res = /** @type {any} */ (await apiClient.post('/api/media/upload', data));
    return res.data || res;
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

  async uploadFile(file, options = {}) {
    const category = options.category || 'payment_slip';
    const restaurantId = options.restaurantId || undefined;

    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    const fileType = file.type || 'image/jpeg';
    const fileName = file.name || 'receipt.jpg';

    return await this.uploadMediaServerProxy({
      category,
      fileName,
      fileType,
      fileSize: file.size,
      restaurantId,
      base64Data,
    });
  },
};
