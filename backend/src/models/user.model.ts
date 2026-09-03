import bcrypt from 'bcryptjs';
import { Schema, model, type Document } from 'mongoose';

export type UserRole = 'CUSTOMER' | 'RESTAURANT_ADMIN' | 'SUPER_ADMIN';

export interface IUser extends Document {
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'User email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'User full name is required'],
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    role: {
      type: String,
      enum: {
        values: ['CUSTOMER', 'RESTAURANT_ADMIN', 'SUPER_ADMIN'],
        message: 'Invalid marketplace role: {VALUE}',
      },
      default: 'CUSTOMER',
      index: true,
    },
    passwordHash: {
      type: String,
      default: '',
      select: false, // Do not return passwordHash in queries by default
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Hashes a plaintext password securely using bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compares a candidate plaintext password against a stored bcrypt hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export const User = model<IUser>('User', userSchema);
