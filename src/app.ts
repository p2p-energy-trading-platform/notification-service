import Fastify from 'fastify';

import type { AppConfig } from './config/types.js';
import { createLoggerOptions } from './observability/logging.js';
import httpRoutes from './transport/http/routes.js';

export interface BuildAppOptions {
  config: AppConfig;
}

export function buildApp(options: BuildAppOptions) {
  const { config } = options;

  const app = Fastify({
    logger: createLoggerOptions(config),

    bodyLimit: 1_048_576,
  });

  app.decorate('config', config);

  app.register(httpRoutes);

  return app;
}
