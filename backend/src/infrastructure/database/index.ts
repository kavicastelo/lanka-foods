import mongoose from 'mongoose';
import { config } from '../../config/index.js';

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function connectDatabase(uri: string = config.MONGODB_URI, force: boolean = false): Promise<void> {
  if (isDatabaseConnected() && !force) {
    return;
  }

  if (force && isDatabaseConnected()) {
    await disconnectDatabase();
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, {
      autoIndex: true, // Automatically build indexes defined in schemas
      serverSelectionTimeoutMS: 10000,
    });
  } catch (err) {
    const error = err as Error;
    throw new Error(`Failed to connect to MongoDB: ${error.message}`);
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
