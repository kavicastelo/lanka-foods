import type { IRestaurant } from '../../models/restaurant.model.js';

export interface PublicRestaurantDto {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  coverImageUrl: string;
  logoText: string;
  description: string;
  cuisines: string[];
  priceRange: string;
  prepTime: string;
  minOrder: number;
  deliveryFee: number;
  pickup: boolean;
  delivery: boolean;
  halal: boolean;
  catering: boolean;
  isOpen: boolean;
  hours: string;
  timeSlots: string[];
  featured: boolean;
  status: string;
  ratingAverage: number;
  reviewCount: number;
  createdAt: string;
}

export interface OwnerRestaurantDto extends PublicRestaurantDto {
  ownerId: string;
  commissionRate?: number;
  updatedAt: string;
}

export function toPublicRestaurantDto(restaurant: Partial<IRestaurant> & { _id: unknown }): PublicRestaurantDto {
  return {
    id: restaurant._id ? restaurant._id.toString() : '',
    name: restaurant.name || '',
    slug: restaurant.slug || '',
    city: restaurant.city || '',
    address: restaurant.address || '',
    phone: restaurant.phone || '',
    email: restaurant.email || '',
    coverImageUrl: restaurant.coverImageUrl || '',
    logoText: restaurant.logoText || '',
    description: restaurant.description || '',
    cuisines: restaurant.cuisines || [],
    priceRange: restaurant.priceRange || '€€',
    prepTime: restaurant.prepTime || '20-30 min',
    minOrder: restaurant.minOrder || 0,
    deliveryFee: restaurant.deliveryFee || 0,
    pickup: restaurant.pickup ?? true,
    delivery: restaurant.delivery ?? true,
    halal: restaurant.halal ?? false,
    catering: restaurant.catering ?? false,
    isOpen: restaurant.isOpen ?? true,
    hours: restaurant.hours || '',
    timeSlots: restaurant.timeSlots || [],
    featured: restaurant.featured ?? false,
    status: restaurant.status || 'pending',
    ratingAverage: restaurant.ratingAverage ?? 0,
    reviewCount: restaurant.reviewCount ?? 0,
    createdAt: restaurant.createdAt ? new Date(restaurant.createdAt).toISOString() : new Date().toISOString(),
  };
}

export function toOwnerRestaurantDto(restaurant: Partial<IRestaurant> & { _id: unknown }): OwnerRestaurantDto {
  const publicDto = toPublicRestaurantDto(restaurant);
  return {
    ...publicDto,
    ownerId: restaurant.ownerId ? restaurant.ownerId.toString() : '',
    commissionRate: restaurant.commissionRate,
    updatedAt: restaurant.updatedAt ? new Date(restaurant.updatedAt).toISOString() : new Date().toISOString(),
  };
}
