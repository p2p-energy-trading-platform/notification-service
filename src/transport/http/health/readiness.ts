import type { FastifyInstance } from 'fastify';

async function passes(check: () => Promise<unknown>): Promise<boolean> {
  try {
    await check();
    return true;
  } catch {
    return false;
  }
}


export async function readiness(fastify: FastifyInstance) {
  const checks: Record<string, boolean> = {};

  if (fastify.hasDecorator('db')) {
    checks.database = await passes(() => fastify.db`SELECT 1`);
  }

  if (fastify.hasDecorator('redis')) {
    checks.redis = await passes(() => fastify.redis.ping());
  }

  if (checks.database === false) {
    fastify.log.error('Database readiness check failed');
  }

  if (checks.redis === false) {
    fastify.log.warn('Redis readiness check failed');
  }

  const ready = checks.database !== false;

  return {
    status: ready ? 'ok' : 'not_ready',
    checks,
  };
}
