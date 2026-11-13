import type { AppConfig } from '../config/types.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
  }
}
