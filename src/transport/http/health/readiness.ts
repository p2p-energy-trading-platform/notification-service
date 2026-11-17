import type { FastifyInstance } from 'fastify';

import {
  EXPECTED_MIGRATION_VERSION,
  currentMigrationVersion,
} from '../../../infrastructure/database/migrations.js';

async function passes(check: () => Promise<unknown>): Promise<boolean> {
  try {
    const result = await check();
    return result !== false;
  } catch {
    return false;
  }
}

export async function readiness(fastify: FastifyInstance) {
  const checks: Record<string, boolean> = {};
  const required: string[] = [];

  if (fastify.hasDecorator('db')) {
    checks.database = await passes(() => fastify.db`SELECT 1`);
    required.push('database');

    checks.migrations =
      checks.database &&
      (await passes(
        async () => (await currentMigrationVersion(fastify.db)) >= EXPECTED_MIGRATION_VERSION,
      ));
    required.push('migrations');
  }

  if (fastify.hasDecorator('redis')) {
    checks.redis = await passes(() => fastify.redis.ping());
  }

  for (const { readiness: componentCheck } of fastify.components) {
    if (componentCheck) {
      checks[componentCheck.name] = await passes(() => componentCheck.check());
      required.push(componentCheck.name);
    }
  }

  const failed = required.filter((name) => !checks[name]);

  if (failed.length > 0) {
    fastify.log.error({ failed }, 'Readiness check failed');
  }

  if (checks.redis === false) {
    fastify.log.warn('Redis readiness check failed');
  }

  return {
    status: failed.length === 0 ? 'ok' : 'not_ready',
    checks,
  };
}
