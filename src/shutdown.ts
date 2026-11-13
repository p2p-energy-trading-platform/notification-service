import type { FastifyBaseLogger } from 'fastify';

export interface ShutdownOptions {
  app: {
    log: FastifyBaseLogger;
    close(): Promise<unknown>;
  };

  timeoutMs: number;

  exit?: (code: number) => void;
}

export function createShutdown(options: ShutdownOptions) {
  const { app, timeoutMs, exit = (code: number) => process.exit(code) } = options;

  let inProgress = false;

  return async function shutdown(signal: string): Promise<void> {
    if (inProgress) {
      app.log.warn({ signal }, 'Shutdown already in progress');
      return;
    }

    inProgress = true;

    app.log.info({ signal, timeoutMs }, 'Shutdown started: no new work, finishing in-flight work');

    const timer = setTimeout(() => {
      app.log.error({ timeoutMs }, 'Shutdown timed out, forcing exit');
      exit(1);
    }, timeoutMs);

    try {
      await app.close();

      clearTimeout(timer);
      app.log.info('Shutdown complete');
      exit(0);
    } catch (error) {
      clearTimeout(timer);
      app.log.error({ err: error }, 'Error during shutdown');
      exit(1);
    }
  };
}
