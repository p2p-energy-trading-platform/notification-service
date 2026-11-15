import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';
import type { DbClient } from '../../src/infrastructure/database/client.js';
import type { RedisClient } from '../../src/infrastructure/redis/client.js';
import { testConfig } from '../fixtures/config.js';

type App = ReturnType<typeof buildApp>;

const ok = async () => [{ '?column?': 1 }];
const down = async () => {
  throw new Error('connection refused');
};

function appWith(db: () => Promise<unknown>, redis: () => Promise<unknown>): App {
  const app = buildApp({ config: testConfig(), components: [], registerInfrastructure: false });

  app.decorate('db', db as unknown as DbClient);
  app.decorate('redis', { ping: redis } as unknown as RedisClient);

  return app;
}

describe('GET /health/ready', () => {
  let app: App | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it('is ready when PostgreSQL and Redis are up', async () => {
    app = appWith(ok, async () => 'PONG');

    const response = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', checks: { database: true, redis: true } });
  });

  it('is not ready (503) when PostgreSQL is down', async () => {
    app = appWith(down, async () => 'PONG');

    const response = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      status: 'not_ready',
      checks: { database: false, redis: true },
    });
  });

  it('stays ready when only Redis is down (fail open)', async () => {
    app = appWith(ok, down);

    const response = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', checks: { database: true, redis: false } });
  });
});
