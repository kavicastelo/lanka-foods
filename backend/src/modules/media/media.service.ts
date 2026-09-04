import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { R2StorageService } from '../../infrastructure/storage/r2-client.js';
import { Restaurant } from '../../models/restaurant.model.js';
import { toUploadUrlResponseDto, type UploadUrlResponseDto } from './media.mapper.js';
import type { DeleteMediaInput, RequestUploadUrlInput, UploadMediaInput } from './media.schemas.js';

export class MediaService {
  /**
   * Generates a server-authoritative presigned R2 upload URL for direct-to-storage upload.
   * Enforces strict RBAC ownership, target entity validation, file size & MIME type limits.
   */
  static async requestUploadUrl(
    requestingUserId: string,
    userRole: string,
    input: RequestUploadUrlInput
  ): Promise<UploadUrlResponseDto> {
    const isRestaurantMedia =
      input.category === 'restaurant_cover' ||
      input.category === 'restaurant_logo' ||
      input.category === 'menu_item';

    let restaurantIdObj: mongoose.Types.ObjectId | null = null;

    if (isRestaurantMedia) {
      if (!input.restaurantId || !mongoose.Types.ObjectId.isValid(input.restaurantId)) {
        const error = new Error('Valid restaurantId is required for restaurant or menu media') as Error & {
          statusCode?: number;
        };
        error.statusCode = 400;
        throw error;
      }

      const restaurant = await Restaurant.findById(input.restaurantId);
      if (!restaurant) {
        const error = new Error('Restaurant not found') as Error & { statusCode?: number };
        error.statusCode = 404;
        throw error;
      }

      // Ownership Verification
      if (userRole !== 'SUPER_ADMIN' && restaurant.ownerId.toString() !== requestingUserId) {
        const error = new Error('Unauthorized to manage media for this restaurant') as Error & {
          statusCode?: number;
        };
        error.statusCode = 403;
        throw error;
      }

      restaurantIdObj = restaurant._id;
    }

    // Extract & sanitize file extension
    const extMatch = input.fileName.match(/\.([a-zA-Z0-9]+)$/);
    const rawExt = extMatch ? extMatch[1].toLowerCase() : '';
    const ext = ['jpeg', 'jpg', 'png', 'webp'].includes(rawExt) ? rawExt : 'jpg';

    // Server-Authoritative Collision-Resistant Object Key Strategy
    const uuid = crypto.randomUUID();
    let objectKey: string;

    switch (input.category) {
      case 'restaurant_cover':
        objectKey = `restaurants/${restaurantIdObj!.toString()}/cover/${uuid}.${ext}`;
        break;
      case 'restaurant_logo':
        objectKey = `restaurants/${restaurantIdObj!.toString()}/logo/${uuid}.${ext}`;
        break;
      case 'menu_item':
        objectKey = `menu-items/${restaurantIdObj!.toString()}/${uuid}.${ext}`;
        break;
      case 'application_logo':
      case 'application_cover':
        objectKey = `applications/${requestingUserId}/${uuid}.${ext}`;
        break;
      case 'payment_slip':
        objectKey = `payment-slips/${requestingUserId}/${uuid}.${ext}`;
        break;
      default:
        objectKey = `uploads/${requestingUserId}/${uuid}.${ext}`;
        break;
    }

    const result = await R2StorageService.generateUploadUrl(objectKey, input.fileType);
    return toUploadUrlResponseDto(result);
  }

  /**
   * Directly uploads buffer object to Cloudflare R2 via backend server to bypass CORS.
   */
  static async uploadMediaDirectly(
    requestingUserId: string,
    userRole: string,
    input: UploadMediaInput
  ): Promise<{ publicUrl: string; objectKey: string }> {
    const isRestaurantMedia =
      input.category === 'restaurant_cover' ||
      input.category === 'restaurant_logo' ||
      input.category === 'menu_item';

    let restaurantIdObj: mongoose.Types.ObjectId | null = null;

    if (isRestaurantMedia) {
      if (!input.restaurantId || !mongoose.Types.ObjectId.isValid(input.restaurantId)) {
        const error = new Error('Valid restaurantId is required for restaurant or menu media') as Error & {
          statusCode?: number;
        };
        error.statusCode = 400;
        throw error;
      }

      const restaurant = await Restaurant.findById(input.restaurantId);
      if (!restaurant) {
        const error = new Error('Restaurant not found') as Error & { statusCode?: number };
        error.statusCode = 404;
        throw error;
      }

      if (userRole !== 'SUPER_ADMIN' && restaurant.ownerId.toString() !== requestingUserId) {
        const error = new Error('Unauthorized to manage media for this restaurant') as Error & {
          statusCode?: number;
        };
        error.statusCode = 403;
        throw error;
      }

      restaurantIdObj = restaurant._id;
    }

    const extMatch = input.fileName.match(/\.([a-zA-Z0-9]+)$/);
    const rawExt = extMatch ? extMatch[1].toLowerCase() : '';
    const ext = ['jpeg', 'jpg', 'png', 'webp'].includes(rawExt) ? rawExt : 'jpg';

    const uuid = crypto.randomUUID();
    let objectKey: string;

    switch (input.category) {
      case 'restaurant_cover':
        objectKey = `restaurants/${restaurantIdObj!.toString()}/cover/${uuid}.${ext}`;
        break;
      case 'restaurant_logo':
        objectKey = `restaurants/${restaurantIdObj!.toString()}/logo/${uuid}.${ext}`;
        break;
      case 'menu_item':
        objectKey = `menu-items/${restaurantIdObj!.toString()}/${uuid}.${ext}`;
        break;
      case 'application_logo':
      case 'application_cover':
        objectKey = `applications/${requestingUserId}/${uuid}.${ext}`;
        break;
      case 'payment_slip':
        objectKey = `payment-slips/${requestingUserId}/${uuid}.${ext}`;
        break;
      default:
        objectKey = `uploads/${requestingUserId}/${uuid}.${ext}`;
        break;
    }

    const cleanBase64 = input.base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const publicUrl = await R2StorageService.uploadBuffer(objectKey, buffer, input.fileType);
    return { publicUrl, objectKey };
  }

  /**
   * Deletes object from Cloudflare R2 storage with RBAC ownership authorization.
   */
  static async deleteMedia(
    requestingUserId: string,
    userRole: string,
    input: DeleteMediaInput
  ): Promise<{ message: string; objectKey: string }> {
    if (userRole !== 'SUPER_ADMIN') {
      if (input.restaurantId) {
        if (!mongoose.Types.ObjectId.isValid(input.restaurantId)) {
          const error = new Error('Invalid restaurantId format') as Error & { statusCode?: number };
          error.statusCode = 400;
          throw error;
        }

        const restaurant = await Restaurant.findById(input.restaurantId);
        if (!restaurant || restaurant.ownerId.toString() !== requestingUserId) {
          const error = new Error('Unauthorized to delete media for this restaurant') as Error & {
            statusCode?: number;
          };
          error.statusCode = 403;
          throw error;
        }
      } else if (
        !input.objectKey.startsWith(`applications/${requestingUserId}/`) &&
        !input.objectKey.startsWith(`payment-slips/${requestingUserId}/`) &&
        !input.objectKey.startsWith(`uploads/${requestingUserId}/`)
      ) {
        const error = new Error('Unauthorized to delete this media object') as Error & {
          statusCode?: number;
        };
        error.statusCode = 403;
        throw error;
      }
    }

    await R2StorageService.deleteObject(input.objectKey);
    return {
      message: 'Media object deleted successfully',
      objectKey: input.objectKey,
    };
  }
}
