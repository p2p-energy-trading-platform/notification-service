import fp from 'fastify-plugin';

import { createDbClient, verifyConnection } from '../infrastructure/database/client.js';

export default fp(async (fastify) => {
  const sql = createDbClient({
    databaseUrl: fastify.config.DATABASE_URL,
    max: 10,
    idleTimeout: 30, // seconds
    connectTimeout: 5, // seconds
    onNotice: (notice) => fastify.log.debug({ notice }, 'PostgreSQL notice'),
  });

  // PostgreSQL is required: fail startup if it is unreachable or the schema is wrong.
  try {
    const { user, schema } = await verifyConnection(sql);
    fastify.log.info({ user, schema }, 'PostgreSQL connected');
  } catch (error) {
    fastify.log.error({ err: error }, 'Failed to connect to PostgreSQL');
    await sql.end({ timeout: 1 });
    throw error;
  }

  fastify.decorate('db', sql);

  fastify.addHook('onClose', async () => {
    await sql.end({ timeout: 5 });
  });
});
