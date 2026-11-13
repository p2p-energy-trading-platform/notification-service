import Fastify from 'fastify';

import type { AppConfig } from './config/types.js';
import { createLoggerOptions } from './observability/logging.js';
import { type Component, createRoleComponents } from './roles.js';
import httpRoutes from './transport/http/routes.js';

export interface BuildAppOptions {
  config: AppConfig;
  components?: Component[];
}

export function buildApp(options: BuildAppOptions) {
  const { config } = options;

  const app = Fastify({
    logger: createLoggerOptions(config),

    bodyLimit: 1_048_576,
  });

  app.decorate('config', config);

  app.register(httpRoutes);

  const components = options.components ?? createRoleComponents(config.SERVICE_ROLES, app.log);

  for (const component of components) {
    app.addHook('onReady', () => component.start());
    app.addHook('onClose', () => component.stop());
  }

  return app;
}
