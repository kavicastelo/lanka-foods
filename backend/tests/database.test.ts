import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from '../src/infrastructure/database/index.js';
import {
  CommissionConfig,
  Favorite,
  GlobalCategory,
  MenuCategory,
  MenuItem,
  Order,
  Restaurant,
  RestaurantApplication,
  Review,
  User,
  type RestaurantStatus,
  type UserRole,
  generateNextOrderNumber,
} from '../src/models/index.js';
import { centsToEuros, eurosToCents } from '../src/utils/money.js';

describe('Phase 2 — MongoDB Domain Model & Mongoose Schemas Integration Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await connectDatabase(mongoUri);
    // Ensure all indexes are built in MongoDB Memory Server
    await Promise.all(
      Object.values(mongoose.models).map((model) => model.init())
    );
  }, 60000);

  afterAll(async () => {
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }, 30000);

  describe('Database Connection Infrastructure', () => {
    it('should be connected to MongoDB in memory', () => {
      expect(isDatabaseConnected()).toBe(true);
    });

    it('should fail cleanly when connecting to an invalid host', async () => {
      await disconnectDatabase();
      await expect(
        connectDatabase('mongodb://127.0.0.1:27099/non_existent_db', true)
      ).rejects.toThrow();
      await connectDatabase(mongoServer.getUri(), true);
    }, 15000);
  });

  describe('Monetary Storage Conversion', () => {
    it('should accurately convert euros to integer minor units (cents)', () => {
      expect(eurosToCents(12.5)).toBe(1250);
      expect(eurosToCents(0.99)).toBe(99);
      expect(eurosToCents(15.0)).toBe(1500);
      expect(eurosToCents(0.0)).toBe(0);
    });

    it('should accurately convert integer minor units (cents) to formatted euros', () => {
      expect(centsToEuros(1250)).toBe(12.5);
      expect(centsToEuros(99)).toBe(0.99);
      expect(centsToEuros(1500)).toBe(15.0);
      expect(centsToEuros(0)).toBe(0.0);
    });
  });

  describe('User Domain Model & Validation', () => {
    it('should create and persist a valid User document', async () => {
      const user = await User.create({
        email: 'customer@example.com',
        fullName: 'Mika Korhonen',
        phone: '+358401234567',
        role: 'CUSTOMER',
      });

      expect(user._id).toBeDefined();
      expect(user.email).toBe('customer@example.com');
      expect(user.role).toBe('CUSTOMER');
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should reject invalid role enum values', async () => {
      await expect(
        User.create({
          email: 'invalid-role@example.com',
          fullName: 'Test User',
          role: 'INVALID_ROLE' as unknown as UserRole,
        })
      ).rejects.toThrow();
    });

    it('should enforce database unique constraint on email', async () => {
      await User.create({
        email: 'unique-user@example.com',
        fullName: 'First User',
      });

      await expect(
        User.create({
          email: 'unique-user@example.com',
          fullName: 'Duplicate User',
        })
      ).rejects.toThrow(/E11000 duplicate key/);
    });
  });

  describe('Restaurant Domain Model & Validation', () => {
    it('should create a valid Restaurant document', async () => {
      const owner = await User.create({
        email: 'owner@galle.fi',
        fullName: 'Nuwan Perera',
        role: 'RESTAURANT_ADMIN',
      });

      const restaurant = await Restaurant.create({
        name: 'Galle Garden Kitchen',
        slug: 'galle-garden-kitchen',
        ownerId: owner._id,
        city: 'Helsinki',
        address: 'Mannerheimintie 10',
        minOrder: 1500, // €15.00
        deliveryFee: 350, // €3.50
        status: 'active',
      });

      expect(restaurant._id).toBeDefined();
      expect(restaurant.slug).toBe('galle-garden-kitchen');
      expect(restaurant.minOrder).toBe(1500);
      expect(restaurant.status).toBe('active');
    });

    it('should enforce unique index constraint on slug', async () => {
      const owner = await User.create({
        email: 'owner2@galle.fi',
        fullName: 'Second Owner',
      });

      await Restaurant.create({
        name: 'Galle Garden',
        slug: 'galle-garden-unique',
        ownerId: owner._id,
        city: 'Helsinki',
        minOrder: 1000,
        deliveryFee: 200,
      });

      await expect(
        Restaurant.create({
          name: 'Galle Garden 2',
          slug: 'galle-garden-unique',
          ownerId: owner._id,
          city: 'Espoo',
          minOrder: 1000,
          deliveryFee: 200,
        })
      ).rejects.toThrow(/E11000 duplicate key/);
    });

    it('should reject invalid status enum values', async () => {
      const owner = await User.create({
        email: 'owner3@galle.fi',
        fullName: 'Third Owner',
      });

      await expect(
        Restaurant.create({
          name: 'Invalid Status Restaurant',
          slug: 'invalid-status-rest',
          ownerId: owner._id,
          city: 'Vantaa',
          status: 'invalid-status' as unknown as RestaurantStatus,
        })
      ).rejects.toThrow();
    });
  });

  describe('Menu Category & Menu Item Domain Models', () => {
    it('should enforce compound unique index on (restaurantId + name) for MenuCategory', async () => {
      const owner = await User.create({ email: 'catowner@galle.fi', fullName: 'Cat Owner' });
      const restaurant = await Restaurant.create({
        name: 'Category Rest',
        slug: 'cat-rest',
        ownerId: owner._id,
        city: 'Helsinki',
      });

      const category = await GlobalCategory.create({
        name: 'Rice & Curry',
        slug: 'rice-and-curry',
      });
      expect(category._id).toBeDefined();

      await MenuCategory.create({
        restaurantId: restaurant._id,
        name: 'Rice & Curry',
      });

      await expect(
        MenuCategory.create({
          restaurantId: restaurant._id,
          name: 'Rice & Curry',
        })
      ).rejects.toThrow(/E11000 duplicate key/);
    });

    it('should enforce positive prices for MenuItem in minor units', async () => {
      const owner = await User.create({ email: 'itemowner@galle.fi', fullName: 'Item Owner' });
      const restaurant = await Restaurant.create({
        name: 'Item Rest',
        slug: 'item-rest',
        ownerId: owner._id,
        city: 'Helsinki',
      });
      const category = await MenuCategory.create({
        restaurantId: restaurant._id,
        name: 'Kottu',
      });

      await expect(
        MenuItem.create({
          restaurantId: restaurant._id,
          categoryId: category._id,
          name: 'Negative Kottu',
          price: -500, // Invalid negative price
        })
      ).rejects.toThrow();
    });
  });

  describe('Order & OrderItem Historical Snapshot Invariant', () => {
    it('should guarantee atomic, unique sequential order number generation', async () => {
      const numbers = await Promise.all([
        generateNextOrderNumber(),
        generateNextOrderNumber(),
        generateNextOrderNumber(),
      ]);

      expect(numbers).toHaveLength(3);
      expect(new Set(numbers).size).toBe(3); // All 3 order numbers are distinct
      expect(numbers[0]).toMatch(/^LE-\d+$/);
    });

    it('should preserve historical OrderItem snapshot data when MenuItem is subsequently updated', async () => {
      const owner = await User.create({ email: 'orderowner@galle.fi', fullName: 'Order Owner' });
      const customer = await User.create({ email: 'customer1@galle.fi', fullName: 'Customer One' });
      const restaurant = await Restaurant.create({
        name: 'Snapshot Rest',
        slug: 'snapshot-rest',
        ownerId: owner._id,
        city: 'Helsinki',
      });
      const category = await MenuCategory.create({
        restaurantId: restaurant._id,
        name: 'Mains',
      });
      const menuItem = await MenuItem.create({
        restaurantId: restaurant._id,
        categoryId: category._id,
        name: 'Original Chicken Kottu',
        price: 1250, // €12.50
      });

      const orderNumber = await generateNextOrderNumber();
      const order = await Order.create({
        orderNumber,
        restaurantId: restaurant._id,
        customerId: customer._id,
        customerName: customer.fullName,
        customerEmail: customer.email,
        deliveryType: 'delivery',
        status: 'received',
        subtotal: 1250,
        deliveryFee: 350,
        serviceFee: 99,
        total: 1699,
        items: [
          {
            menuItemId: menuItem._id,
            nameSnapshot: menuItem.name,
            unitPrice: menuItem.price,
            quantity: 1,
            subtotal: 1250,
          },
        ],
      });

      // Mutate original MenuItem in database (Price increased to €15.00, Name changed)
      menuItem.name = 'Updated Special Kottu';
      menuItem.price = 1500;
      await menuItem.save();

      // Reload order from database
      const reloadedOrder = await Order.findById(order._id);
      expect(reloadedOrder).not.toBeNull();
      expect(reloadedOrder!.items[0].nameSnapshot).toBe('Original Chicken Kottu');
      expect(reloadedOrder!.items[0].unitPrice).toBe(1250);
      expect(reloadedOrder!.subtotal).toBe(1250);
      expect(reloadedOrder!.total).toBe(1699);
    });

    it('should reject orders with empty items array', async () => {
      const owner = await User.create({ email: 'emptyowner@galle.fi', fullName: 'Empty Owner' });
      const customer = await User.create({ email: 'emptycustomer@galle.fi', fullName: 'Empty Customer' });
      const restaurant = await Restaurant.create({
        name: 'Empty Order Rest',
        slug: 'empty-order-rest',
        ownerId: owner._id,
        city: 'Helsinki',
      });

      const orderNumber = await generateNextOrderNumber();
      await expect(
        Order.create({
          orderNumber,
          restaurantId: restaurant._id,
          customerId: customer._id,
          customerName: customer.fullName,
          customerEmail: customer.email,
          deliveryType: 'pickup',
          subtotal: 0,
          deliveryFee: 0,
          serviceFee: 99,
          total: 99,
          items: [], // Empty items array should trigger validation failure
        })
      ).rejects.toThrow();
    });
  });

  describe('Review Domain Model & Unique Order Review Constraint', () => {
    it('should enforce database unique constraint on orderId (1 review per completed order)', async () => {
      const owner = await User.create({ email: 'revowner@galle.fi', fullName: 'Rev Owner' });
      const customer = await User.create({ email: 'revcustomer@galle.fi', fullName: 'Rev Customer' });
      const restaurant = await Restaurant.create({
        name: 'Review Rest',
        slug: 'review-rest',
        ownerId: owner._id,
        city: 'Helsinki',
      });
      const category = await MenuCategory.create({ restaurantId: restaurant._id, name: 'Food' });
      const item = await MenuItem.create({ restaurantId: restaurant._id, categoryId: category._id, name: 'Hopper', price: 500 });
      const order = await Order.create({
        orderNumber: await generateNextOrderNumber(),
        restaurantId: restaurant._id,
        customerId: customer._id,
        customerName: customer.fullName,
        customerEmail: customer.email,
        deliveryType: 'pickup',
        status: 'completed',
        subtotal: 500,
        deliveryFee: 0,
        serviceFee: 99,
        total: 599,
        items: [{ menuItemId: item._id, nameSnapshot: item.name, unitPrice: 500, quantity: 1, subtotal: 500 }],
      });

      // First review succeeds
      await Review.create({
        restaurantId: restaurant._id,
        orderId: order._id,
        authorId: customer._id,
        authorName: customer.fullName,
        rating: 5,
        foodRating: 5,
        text: 'Delicious food!',
      });

      // Second review for same orderId must fail with duplicate key error
      await expect(
        Review.create({
          restaurantId: restaurant._id,
          orderId: order._id,
          authorId: customer._id,
          authorName: customer.fullName,
          rating: 4,
          foodRating: 4,
          text: 'Second attempt should fail',
        })
      ).rejects.toThrow(/E11000 duplicate key/);
    });

    it('should reject reviews with invalid rating range (< 1 or > 5)', async () => {
      const owner = await User.create({ email: 'revowner2@galle.fi', fullName: 'Rev Owner 2' });
      const customer = await User.create({ email: 'revcustomer2@galle.fi', fullName: 'Rev Customer 2' });
      const restaurant = await Restaurant.create({ name: 'Review Rest 2', slug: 'review-rest-2', ownerId: owner._id, city: 'Helsinki' });
      const category = await MenuCategory.create({ restaurantId: restaurant._id, name: 'Food' });
      const item = await MenuItem.create({ restaurantId: restaurant._id, categoryId: category._id, name: 'Rice', price: 800 });
      const order = await Order.create({
        orderNumber: await generateNextOrderNumber(),
        restaurantId: restaurant._id,
        customerId: customer._id,
        customerName: customer.fullName,
        customerEmail: customer.email,
        deliveryType: 'pickup',
        subtotal: 800,
        deliveryFee: 0,
        serviceFee: 99,
        total: 899,
        items: [{ menuItemId: item._id, nameSnapshot: item.name, unitPrice: 800, quantity: 1, subtotal: 800 }],
      });

      await expect(
        Review.create({
          restaurantId: restaurant._id,
          orderId: order._id,
          authorId: customer._id,
          authorName: customer.fullName,
          rating: 6, // Invalid rating > 5
          foodRating: 5,
        })
      ).rejects.toThrow();
    });
  });

  describe('Favorite & Restaurant Application Domain Models', () => {
    it('should enforce unique index constraint on (userId + restaurantId) for Favorite', async () => {
      const user = await User.create({ email: 'favuser@galle.fi', fullName: 'Fav User' });
      const owner = await User.create({ email: 'favowner@galle.fi', fullName: 'Fav Owner' });
      const restaurant = await Restaurant.create({ name: 'Fav Rest', slug: 'fav-rest', ownerId: owner._id, city: 'Helsinki' });

      await Favorite.create({
        userId: user._id,
        restaurantId: restaurant._id,
      });

      await expect(
        Favorite.create({
          userId: user._id,
          restaurantId: restaurant._id,
        })
      ).rejects.toThrow(/E11000 duplicate key/);
    });

    it('should create valid RestaurantApplication and CommissionConfig documents', async () => {
      const applicant = await User.create({ email: 'applicant@galle.fi', fullName: 'Applicant User' });

      const application = await RestaurantApplication.create({
        applicantUserId: applicant._id,
        businessName: 'Kandy Express',
        ownerName: 'Applicant User',
        email: 'applicant@galle.fi',
        city: 'Tampere',
        status: 'pending',
      });

      const commission = await CommissionConfig.create({
        defaultRate: 12,
        updatedBy: applicant._id,
      });

      expect(application._id).toBeDefined();
      expect(application.status).toBe('pending');
      expect(commission.defaultRate).toBe(12);
    });
  });

  describe('MongoDB Actual Index Verification (listIndexes)', () => {
    it('should confirm physical existence of unique indexes in MongoDB', async () => {
      const userIndexes = await User.collection.listIndexes().toArray();
      const userIndexKeys = userIndexes.map((idx) => idx.name);
      expect(userIndexKeys.some((k) => k.includes('email'))).toBe(true);

      const restaurantIndexes = await Restaurant.collection.listIndexes().toArray();
      const restIndexKeys = restaurantIndexes.map((idx) => idx.name);
      expect(restIndexKeys.some((k) => k.includes('slug'))).toBe(true);

      const orderIndexes = await Order.collection.listIndexes().toArray();
      const orderIndexKeys = orderIndexes.map((idx) => idx.name);
      expect(orderIndexKeys.some((k) => k.includes('orderNumber'))).toBe(true);

      const reviewIndexes = await Review.collection.listIndexes().toArray();
      const reviewIndexKeys = reviewIndexes.map((idx) => idx.name);
      expect(reviewIndexKeys.some((k) => k.includes('orderId'))).toBe(true);
    });
  });
});
