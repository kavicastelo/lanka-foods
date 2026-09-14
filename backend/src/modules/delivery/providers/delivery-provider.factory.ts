import type { DeliveryProviderType } from '../../../models/delivery.model.js';
import type { IDeliveryProvider } from './delivery-provider.interface.js';
import { MockDeliveryProvider } from './mock-delivery.provider.js';
import { RestaurantDeliveryProvider } from './restaurant-delivery.provider.js';
import { WoltDriveProvider } from './wolt-drive.provider.js';

export class DeliveryProviderFactory {
  static getProvider(providerType: DeliveryProviderType): IDeliveryProvider {
    const woltEnv = (process.env.WOLT_ENVIRONMENT || 'development') as 'development' | 'production' | 'mock';

    if (providerType === 'MOCK') {
      return new MockDeliveryProvider();
    }

    if (providerType === 'RESTAURANT') {
      return new RestaurantDeliveryProvider();
    }

    if (providerType === 'WOLT') {
      if (woltEnv === 'mock') {
        return new MockDeliveryProvider();
      }
      return new WoltDriveProvider(woltEnv);
    }

    return new RestaurantDeliveryProvider();
  }
}
