import { buildApp } from './app.js';
import { config } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './infrastructure/database/index.js';
import { CategoryService } from './modules/categories/category.service.js';

async function startServer() {
  const app = await buildApp();

  // Graceful Shutdown Handler
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}. Starting graceful shutdown...`);
    try {
      await app.close();
      await disconnectDatabase();
      app.log.info('Server shutdown completed cleanly.');
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'Error occurred during server shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  try {
    app.log.info('Connecting to MongoDB database...');
    await connectDatabase();
    app.log.info('MongoDB database connected successfully.');

    app.log.info('Seeding default global categories...');
    await CategoryService.seedDefaultCategories();

    await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(
      {
        port: config.PORT,
        host: config.HOST,
        env: config.NODE_ENV,
        service: config.SERVICE_NAME,
        version: config.SERVICE_VERSION,
      },
      `Server listening at http://${config.HOST}:${config.PORT}`
    );
  } catch (err) {
    app.log.fatal({ err }, 'Failed to start backend server');
    process.exit(1);
  }
}

void startServer();
