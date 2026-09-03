import { config } from '../../config/index.js';

export const loggerOptions = {
  level: config.LOG_LEVEL,
  transport:
    config.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-access-token"]',
      '*.password',
      '*.token',
      '*.secret',
    ],
    remove: true,
  },
};
