import { config } from '../../config/index.js';
import { Order } from '../../models/order.model.js';
import { User, comparePassword, hashPassword, type IUser } from '../../models/user.model.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';

export class AuthService {
  /**
   * Registers a new customer account.
   * Public registration ALWAYS defaults to CUSTOMER role to prevent privilege escalation attacks.
   */
  static async registerUser(input: RegisterInput): Promise<IUser> {
    const normalizedEmail = input.email.toLowerCase().trim();

    // Duplicate account check
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const error = new Error('An account with this email already exists.') as Error & { statusCode?: number };
      error.statusCode = 409;
      throw error;
    }

    const passwordHash = await hashPassword(input.password);

    const newUser = await User.create({
      email: normalizedEmail,
      fullName: input.fullName.trim(),
      phone: input.phone?.trim() || '',
      passwordHash,
      role: 'CUSTOMER', // Strict public role limit
      isActive: true,
    });

    return newUser;
  }

  /**
   * Authenticates a user with email and password credentials.
   * Uses generic error messages to prevent account enumeration attacks.
   */
  static async loginUser(input: LoginInput): Promise<IUser> {
    const normalizedEmail = input.email.toLowerCase().trim();

    // Select passwordHash explicitly since select: false is set in schema
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

    if (!user) {
      const error = new Error('Invalid email or password.') as Error & { statusCode?: number };
      error.statusCode = 401;
      throw error;
    }

    // Account status check
    if (!user.isActive) {
      const error = new Error('Account is disabled. Please contact support.') as Error & { statusCode?: number };
      error.statusCode = 401;
      throw error;
    }

    const isPasswordValid = await comparePassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password.') as Error & { statusCode?: number };
      error.statusCode = 401;
      throw error;
    }

    return user;
  }

  /**
   * Fetches current authenticated user profile from database.
   */
  static async getAuthenticatedProfile(userId: string): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      const error = new Error('User account not found or disabled.') as Error & { statusCode?: number };
      error.statusCode = 401;
      throw error;
    }

    return user;
  }

  /**
   * Safe SuperAdmin Bootstrap helper for development and testing.
   */
  static async seedSuperAdmin(): Promise<IUser | null> {
    if (!config.SUPERADMIN_EMAIL || !config.SUPERADMIN_PASSWORD) {
      return null;
    }

    const normalizedEmail = config.SUPERADMIN_EMAIL.toLowerCase().trim();
    let admin = await User.findOne({ email: normalizedEmail });

    if (!admin) {
      const passwordHash = await hashPassword(config.SUPERADMIN_PASSWORD);
      admin = await User.create({
        email: normalizedEmail,
        fullName: 'System Super Admin',
        role: 'SUPER_ADMIN',
        passwordHash,
        isActive: true,
      });
    }

    return admin;
  }

  /**
   * Super Admin endpoint to list registered users with aggregate order & spending metrics.
   */
  static async listAdminUsers(): Promise<Array<{
    id: string;
    email: string;
    fullName: string;
    phone: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    orderCount: number;
    totalSpending: number;
    lastOrderAt: string | null;
  }>> {
    const [users, orders] = await Promise.all([
      User.find().sort({ createdAt: -1 }).lean(),
      Order.find().lean(),
    ]);

    const orderMap: Record<string, { count: number; total: number; lastOrder: string | null }> = {};
    for (const o of orders) {
      const cId = o.customerId.toString();
      if (!orderMap[cId]) {
        orderMap[cId] = { count: 0, total: 0, lastOrder: null };
      }
      orderMap[cId].count += 1;
      if (!['cancelled', 'rejected'].includes(o.status)) {
        orderMap[cId].total += o.subtotal || 0;
      }
      const placedStr = o.placedAt ? new Date(o.placedAt).toISOString() : null;
      if (placedStr && (!orderMap[cId].lastOrder || placedStr > orderMap[cId].lastOrder!)) {
        orderMap[cId].lastOrder = placedStr;
      }
    }

    return users.map((u) => {
      const uId = u._id.toString();
      const stats = orderMap[uId] || { count: 0, total: 0, lastOrder: null };
      return {
        id: uId,
        email: u.email,
        fullName: u.fullName,
        phone: u.phone || '',
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
        orderCount: stats.count,
        totalSpending: +(stats.total / 100).toFixed(2),
        lastOrderAt: stats.lastOrder,
      };
    });
  }

  /**
   * Super Admin toggles user account active / suspended status.
   */
  static async updateUserStatus(userId: string, isActive: boolean): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User account not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }
    user.isActive = isActive;
    await user.save();
  }
}
