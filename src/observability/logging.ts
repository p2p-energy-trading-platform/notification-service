import type { FastifyServerOptions, RawServerDefault } from 'fastify';

import type { AppConfig } from '../config/types.js';

type LoggerOptions = NonNullable<FastifyServerOptions<RawServerDefault>['logger']>;

export function createLoggerOptions(config: AppConfig): LoggerOptions {
  return {
    level: config.LOG_LEVEL,

    base: {
      service: 'notification-service',
      environment: config.NODE_ENV,
    },

    // Never log PII: email addresses, push tokens or message bodies.
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        '*.email',
        '*.pushToken',
        '*.token',
        '*.body',
      ],
      censor: '[REDACTED]',
    },
  };
}
