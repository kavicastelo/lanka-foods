import type { IRestaurantApplication } from '../../models/restaurant-application.model.js';

export interface ApplicationResponseDto {
  id: string;
  applicantUserId: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  businessType: string;
  cuisine: string;
  description: string;
  pickup: boolean;
  delivery: boolean;
  logoUrl: string;
  coverUrl: string;
  status: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedDate: string;
  createdAt: string;
}

export function toApplicationResponseDto(
  app: Partial<IRestaurantApplication> & { _id: unknown }
): ApplicationResponseDto {
  return {
    id: app._id ? app._id.toString() : '',
    applicantUserId: app.applicantUserId ? app.applicantUserId.toString() : '',
    businessName: app.businessName || '',
    ownerName: app.ownerName || '',
    email: app.email || '',
    phone: app.phone || '',
    city: app.city || '',
    address: app.address || '',
    businessType: app.businessType || 'Restaurant',
    cuisine: app.cuisine || '',
    description: app.description || '',
    pickup: app.pickup ?? true,
    delivery: app.delivery ?? true,
    logoUrl: app.logoUrl || '',
    coverUrl: app.coverUrl || '',
    status: app.status || 'pending',
    rejectionReason: app.rejectionReason || '',
    reviewedBy: app.reviewedBy ? app.reviewedBy.toString() : undefined,
    reviewedAt: app.reviewedAt ? new Date(app.reviewedAt).toISOString() : undefined,
    submittedDate: app.submittedDate ? new Date(app.submittedDate).toISOString() : new Date().toISOString(),
    createdAt: app.createdAt ? new Date(app.createdAt).toISOString() : new Date().toISOString(),
  };
}
