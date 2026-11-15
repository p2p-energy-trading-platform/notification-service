import fp from 'fastify-plugin';

import { createRedisClient } from '../infrastructure/redis/client.js';

export default fp(async (fastify) => {
  const client = createRedisClient({
    url: fastify.config.REDIS_URL,
    onError: (error) => fastify.log.warn({ err: error }, 'Redis client error'),
  });

  // Redis is optional (fail open): do not block startup. The client keeps reconnecting.
  client
    .connect()
    .then(() => fastify.log.info('Redis connected'))
    .catch((error: unknown) => fastify.log.warn({ err: error }, 'Redis not available yet'));

  fastify.decorate('redis', client);

  fastify.addHook('onClose', async () => {
    if (client.isOpen) {
      await client.close();
    } else {
      client.destroy();
    }
  });
});
