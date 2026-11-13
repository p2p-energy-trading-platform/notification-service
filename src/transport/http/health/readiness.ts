import type { FastifyInstance } from 'fastify';

// PostgreSQL, Redis and Kafka checks are added when those clients exist.
export async function readiness(_fastify: FastifyInstance) {
  const checks: Record<string, boolean> = {};

  const ready = Object.values(checks).every(Boolean);

  return {
    status: ready ? 'ok' : 'not_ready',
    checks,
  };
}
