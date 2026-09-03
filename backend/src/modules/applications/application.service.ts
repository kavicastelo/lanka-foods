import mongoose from 'mongoose';
import { RestaurantApplication, type IRestaurantApplication } from '../../models/restaurant-application.model.js';
import { Restaurant } from '../../models/restaurant.model.js';
import { User } from '../../models/user.model.js';
import { toOwnerRestaurantDto, type OwnerRestaurantDto } from '../restaurants/restaurant.mapper.js';
import type { PaginatedResult } from '../restaurants/restaurant.service.js';
import { toApplicationResponseDto, type ApplicationResponseDto } from './application.mapper.js';
import type {
  GetApplicationsQueryInput,
  RejectApplicationInput,
  SubmitApplicationInput,
} from './application.schemas.js';

export interface ApprovalResult {
  message: string;
  application: ApplicationResponseDto;
  restaurant: OwnerRestaurantDto;
}

export class ApplicationService {
  /**
   * Submits a prospective restaurant partner application.
   * Derives applicant identity strictly from the authenticated JWT user context.
   */
  static async submitApplication(
    applicantUserId: string,
    input: SubmitApplicationInput
  ): Promise<ApplicationResponseDto> {
    const user = await User.findById(applicantUserId);
    if (!user || !user.isActive) {
      const error = new Error('Applicant user account is inactive or invalid.') as Error & {
        statusCode?: number;
      };
      error.statusCode = 401;
      throw error;
    }

    // Check duplicate pending application rule
    const existingPending = await RestaurantApplication.findOne({
      applicantUserId: user._id,
      status: 'pending',
    });

    if (existingPending) {
      const error = new Error(
        'You already have a pending restaurant application under review.'
      ) as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    const application = await RestaurantApplication.create({
      applicantUserId: user._id,
      businessName: input.businessName.trim(),
      ownerName: input.ownerName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || '',
      city: input.city?.trim() || 'Helsinki',
      address: input.address?.trim() || '',
      businessType: input.businessType?.trim() || 'Restaurant',
      cuisine: input.cuisine?.trim() || 'Sri Lankan',
      description: input.description?.trim() || '',
      pickup: input.pickup ?? true,
      delivery: input.delivery ?? true,
      logoUrl: input.logoUrl?.trim() || '',
      coverUrl: input.coverUrl?.trim() || '',
      status: 'pending',
      submittedDate: new Date(),
    });

    return toApplicationResponseDto(application);
  }

  /**
   * Retrieves the authenticated customer's latest submitted application.
   */
  static async getMyApplication(applicantUserId: string): Promise<ApplicationResponseDto> {
    const application = await RestaurantApplication.findOne({ applicantUserId }).sort({
      submittedDate: -1,
    });

    if (!application) {
      const error = new Error('No restaurant application found for this account.') as Error & {
        statusCode?: number;
      };
      error.statusCode = 404;
      throw error;
    }

    return toApplicationResponseDto(application);
  }

  /**
   * Returns a paginated list of restaurant applications for Super Admin review.
   */
  static async getAdminApplications(
    input: GetApplicationsQueryInput
  ): Promise<PaginatedResult<ApplicationResponseDto>> {
    const page = Math.max(1, input.page);
    const limit = Math.min(50, Math.max(1, input.limit));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (input.status) {
      filter.status = input.status;
    }

    const [total, documents] = await Promise.all([
      RestaurantApplication.countDocuments(filter),
      RestaurantApplication.find(filter).sort({ submittedDate: -1 }).skip(skip).limit(limit).lean(),
    ]);

    const data = documents.map((doc) => toApplicationResponseDto(doc as unknown as IRestaurantApplication));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Super Admin approval workflow:
   * 1. Validates application status.
   * 2. Creates/activates target Restaurant.
   * 3. Promotes user role to RESTAURANT_ADMIN if CUSTOMER.
   * 4. Updates application status to 'approved'.
   * 5. Idempotent retry safe.
   */
  static async approveApplication(
    adminUserId: string,
    applicationId: string
  ): Promise<ApprovalResult> {
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      const error = new Error('Invalid application ID format') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    const application = await RestaurantApplication.findById(applicationId);
    if (!application) {
      const error = new Error('Restaurant application not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    // Check Idempotency / Status
    if (application.status === 'approved') {
      const existingRest = await Restaurant.findOne({ ownerId: application.applicantUserId });
      return {
        message: 'Application is already approved.',
        application: toApplicationResponseDto(application),
        restaurant: toOwnerRestaurantDto(existingRest!),
      };
    }

    if (application.status === 'rejected') {
      const error = new Error('Cannot approve a rejected application.') as Error & {
        statusCode?: number;
      };
      error.statusCode = 400;
      throw error;
    }

    // Create or Activate Restaurant
    let restaurant = await Restaurant.findOne({ ownerId: application.applicantUserId });

    if (restaurant) {
      restaurant.status = 'active';
      restaurant.isOpen = true;
      await restaurant.save();
    } else {
      let baseSlug = application.businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      if (!baseSlug) baseSlug = 'restaurant';

      let slug = baseSlug;
      let counter = 1;
      while (await Restaurant.findOne({ slug })) {
        slug = `${baseSlug}-${counter++}`;
      }

      restaurant = await Restaurant.create({
        name: application.businessName,
        slug,
        ownerId: application.applicantUserId,
        city: application.city || 'Helsinki',
        address: application.address || '',
        phone: application.phone || '',
        email: application.email || '',
        description: application.description || '',
        cuisines: application.cuisine ? [application.cuisine] : ['Sri Lankan'],
        coverImageUrl: application.coverUrl || '',
        pickup: application.pickup,
        delivery: application.delivery,
        isOpen: true,
        status: 'active',
      });
    }

    // Role Activation: Promote customer to RESTAURANT_ADMIN
    const applicantUser = await User.findById(application.applicantUserId);
    if (applicantUser && applicantUser.role === 'CUSTOMER') {
      applicantUser.role = 'RESTAURANT_ADMIN';
      await applicantUser.save();
    }

    // Update Application Status
    application.status = 'approved';
    application.reviewedBy = new mongoose.Types.ObjectId(adminUserId);
    application.reviewedAt = new Date();
    await application.save();

    return {
      message: 'Application approved successfully.',
      application: toApplicationResponseDto(application),
      restaurant: toOwnerRestaurantDto(restaurant),
    };
  }

  /**
   * Super Admin rejection workflow.
   */
  static async rejectApplication(
    adminUserId: string,
    applicationId: string,
    input: RejectApplicationInput
  ): Promise<{ message: string; application: ApplicationResponseDto }> {
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      const error = new Error('Invalid application ID format') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    const application = await RestaurantApplication.findById(applicationId);
    if (!application) {
      const error = new Error('Restaurant application not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    if (application.status === 'approved') {
      const error = new Error('Cannot reject an already approved application.') as Error & {
        statusCode?: number;
      };
      error.statusCode = 400;
      throw error;
    }

    application.status = 'rejected';
    application.rejectionReason = input.reason?.trim() || '';
    application.reviewedBy = new mongoose.Types.ObjectId(adminUserId);
    application.reviewedAt = new Date();
    await application.save();

    return {
      message: 'Application rejected successfully.',
      application: toApplicationResponseDto(application),
    };
  }
}
