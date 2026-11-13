import { buildApp } from './app.js';
import { config } from './config/env.js';
import { createShutdown } from './shutdown.js';

async function main(): Promise<void> {
  const app = buildApp({ config });

  try {
    await app.ready();

    await app.listen({
      host: app.config.HTTP_HOST,
      port: app.config.HTTP_PORT,
    });

    app.log.info(
      {
        http: `${app.config.HTTP_HOST}:${app.config.HTTP_PORT}`,
        roles: app.config.SERVICE_ROLES,
      },
      'Notification service started',
    );
  } catch (error) {
    app.log.fatal({ err: error }, 'Failed to start notification service');

    await app.close();

    process.exitCode = 1;

    return;
  }

  const shutdown = createShutdown({ app, timeoutMs: app.config.SHUTDOWN_TIMEOUT_MS });

  process.once('SIGINT', () => void shutdown('SIGINT'));

  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

void main();
