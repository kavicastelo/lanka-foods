import mongoose from 'mongoose';
import webpush from 'web-push';
import { loadEnvConfig } from '../../config/env.js';
import { logger } from '../../infrastructure/logger/index.js';
import { Notification, type INotification, type NotificationType } from '../../models/notification.model.js';
import { PushSubscription } from '../../models/push-subscription.model.js';
import type { PushSubscribeInput } from './notification.schemas.js';

const config = loadEnvConfig();
if (config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      config.VAPID_SUBJECT || 'mailto:support@lankaeats.fi',
      config.VAPID_PUBLIC_KEY,
      config.VAPID_PRIVATE_KEY
    );
  } catch (err) {
    logger.warn({ err }, 'Failed to configure VAPID details for Web Push');
  }
}

export interface CreateNotificationParams {
  userId?: string | mongoose.Types.ObjectId;
  role?: 'CUSTOMER' | 'RESTAURANT_ADMIN' | 'SUPER_ADMIN';
  restaurantId?: string | mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  static getVapidPublicKey(): string {
    return config.VAPID_PUBLIC_KEY || '';
  }

  static async createNotification(params: CreateNotificationParams): Promise<INotification> {
    const notification = await Notification.create({
      userId: params.userId ? new mongoose.Types.ObjectId(params.userId) : undefined,
      role: params.role,
      restaurantId: params.restaurantId ? new mongoose.Types.ObjectId(params.restaurantId) : undefined,
      type: params.type,
      title: params.title.trim(),
      message: params.message.trim(),
      link: params.link || '',
      metadata: params.metadata || {},
      isRead: false,
    });

    logger.info(
      { notificationId: notification._id, type: params.type, role: params.role, userId: params.userId },
      'Notification created successfully'
    );

    // Dispatch Web Push in background to active device subscriptions (even when browser/app is closed)
    this.sendWebPush(params, notification).catch((err) => {
      logger.warn({ err }, 'Background Web Push dispatch failed');
    });

    return notification;
  }

  static async getNotificationsForUser(options: {
    userId: string;
    role: string;
    restaurantId?: string;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<{ notifications: INotification[]; unreadCount: number }> {
    const limit = options.limit || 20;

    const queryConditions: any[] = [{ userId: new mongoose.Types.ObjectId(options.userId) }];

    if (options.role === 'SUPER_ADMIN') {
      queryConditions.push({ role: 'SUPER_ADMIN' });
    }

    if (options.role === 'RESTAURANT_ADMIN') {
      queryConditions.push({ role: 'RESTAURANT_ADMIN' });
      if (options.restaurantId) {
        queryConditions.push({ restaurantId: new mongoose.Types.ObjectId(options.restaurantId) });
      }
    }

    const filter: any = { $or: queryConditions };

    if (options.unreadOnly) {
      filter.isRead = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .exec(),
      Notification.countDocuments({ ...filter, isRead: false }),
    ]);

    return { notifications, unreadCount };
  }

  static async markAsRead(notificationId: string, _userId: string): Promise<INotification | null> {
    const notification = await Notification.findById(notificationId);
    if (!notification) return null;

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
    return notification;
  }

  static async markAllAsRead(options: {
    userId: string;
    role: string;
    restaurantId?: string;
  }): Promise<{ updatedCount: number }> {
    const queryConditions: any[] = [{ userId: new mongoose.Types.ObjectId(options.userId) }];

    if (options.role === 'SUPER_ADMIN') {
      queryConditions.push({ role: 'SUPER_ADMIN' });
    }

    if (options.role === 'RESTAURANT_ADMIN') {
      queryConditions.push({ role: 'RESTAURANT_ADMIN' });
      if (options.restaurantId) {
        queryConditions.push({ restaurantId: new mongoose.Types.ObjectId(options.restaurantId) });
      }
    }

    const filter = { $or: queryConditions, isRead: false };
    const result = await Notification.updateMany(filter, {
      $set: { isRead: true, readAt: new Date() },
    });

    return { updatedCount: result.modifiedCount };
  }

  static async subscribePush(
    userId: string,
    role: string,
    input: PushSubscribeInput
  ): Promise<{ success: boolean }> {
    await PushSubscription.findOneAndUpdate(
      { endpoint: input.endpoint },
      {
        userId: new mongoose.Types.ObjectId(userId),
        role,
        endpoint: input.endpoint,
        keys: input.keys,
        userAgent: input.userAgent || '',
      },
      { upsert: true, new: true }
    );

    return { success: true };
  }

  private static async sendWebPush(params: CreateNotificationParams, notification: INotification) {
    const subConditions: any[] = [];
    if (params.userId) {
      subConditions.push({ userId: new mongoose.Types.ObjectId(params.userId) });
    }
    if (params.role) {
      subConditions.push({ role: params.role });
    }

    if (subConditions.length === 0) return;

    const subscriptions = await PushSubscription.find({ $or: subConditions });
    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({
      title: notification.title,
      message: notification.message,
      link: notification.link,
      id: notification._id.toString(),
      type: notification.type,
    });

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            payload
          );
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await PushSubscription.deleteOne({ _id: sub._id });
          } else {
            logger.warn({ err, endpoint: sub.endpoint }, 'Failed to dispatch Web Push message');
          }
        }
      })
    );
  }
}
