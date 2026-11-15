import Fastify from 'fastify';
import fp from 'fastify-plugin';

import type { AppConfig } from './config/types.js';
import { createLoggerOptions } from './observability/logging.js';
import databasePlugin from './plugins/database.js';
import redisPlugin from './plugins/redis.js';
import { type Component, createRoleComponents } from './roles.js';
import httpRoutes from './transport/http/routes.js';

export interface BuildAppOptions {
  config: AppConfig;
  components?: Component[];

  registerInfrastructure?: boolean;
}

export function buildApp(options: BuildAppOptions) {
  const { config, registerInfrastructure = true } = options;

  const app = Fastify({
    logger: createLoggerOptions(config),

    bodyLimit: 1_048_576,
  });

  app.decorate('config', config);

  let closing = false;

  app.addHook('preClose', async () => {
    closing = true;
  });

  app.addHook('onSend', async (_request, reply) => {
    if (closing) {
      reply.header('connection', 'close');
    }
  });

  if (registerInfrastructure) {
    app.register(databasePlugin);
    app.register(redisPlugin);
  }

  app.register(httpRoutes);

  const components = options.components ?? createRoleComponents(config.SERVICE_ROLES, app.log);

  app.register(
    fp(async (instance) => {
      instance.addHook('onReady', async () => {
        for (const component of components) {
          await component.start();
        }
      });

      instance.addHook('onClose', async () => {
        for (const component of components) {
          await component.stop();
        }
      });
    }),
  );

  return app;
}
