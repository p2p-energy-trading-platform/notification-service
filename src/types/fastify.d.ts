import type { AppConfig } from '../config/types.js';
import type { DbClient } from '../infrastructure/database/client.js';
import type { RedisClient } from '../infrastructure/redis/client.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;

    db: DbClient;
    redis: RedisClient;
  }
}
