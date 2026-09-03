import type { IMenuCategory } from '../../models/menu-category.model.js';
import type { IMenuItem } from '../../models/menu-item.model.js';

export interface PublicMenuItemDto {
  id: string;
  name: string;
  description: string;
  price: number; // in cents
  imageUrl: string;
  isVegetarian: boolean;
  isAvailable: boolean;
  isPopular: boolean;
  sortOrder: number;
}

export interface PublicMenuCategoryDto {
  id: string;
  name: string;
  sortOrder: number;
  items: PublicMenuItemDto[];
}

export interface PublicMenuCatalogDto {
  restaurant: {
    id: string;
    name: string;
    slug: string;
  };
  categories: PublicMenuCategoryDto[];
}

export interface OwnerMenuCategoryDto {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface OwnerMenuItemDto {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  isVegetarian: boolean;
  isAvailable: boolean;
  isPopular: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function toPublicMenuItemDto(item: Partial<IMenuItem> & { _id: unknown }): PublicMenuItemDto {
  return {
    id: item._id ? item._id.toString() : '',
    name: item.name || '',
    description: item.description || '',
    price: item.price ?? 0,
    imageUrl: item.imageUrl || '',
    isVegetarian: item.isVegetarian ?? false,
    isAvailable: item.isAvailable ?? true,
    isPopular: item.isPopular ?? false,
    sortOrder: item.sortOrder ?? 0,
  };
}

export function toOwnerMenuCategoryDto(category: Partial<IMenuCategory> & { _id: unknown }): OwnerMenuCategoryDto {
  return {
    id: category._id ? category._id.toString() : '',
    restaurantId: category.restaurantId ? category.restaurantId.toString() : '',
    name: category.name || '',
    sortOrder: category.sortOrder ?? 0,
    createdAt: category.createdAt ? new Date(category.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: category.updatedAt ? new Date(category.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export function toOwnerMenuItemDto(item: Partial<IMenuItem> & { _id: unknown }): OwnerMenuItemDto {
  return {
    id: item._id ? item._id.toString() : '',
    restaurantId: item.restaurantId ? item.restaurantId.toString() : '',
    categoryId: item.categoryId ? item.categoryId.toString() : '',
    name: item.name || '',
    description: item.description || '',
    price: item.price ?? 0,
    imageUrl: item.imageUrl || '',
    isVegetarian: item.isVegetarian ?? false,
    isAvailable: item.isAvailable ?? true,
    isPopular: item.isPopular ?? false,
    sortOrder: item.sortOrder ?? 0,
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : new Date().toISOString(),
  };
}
