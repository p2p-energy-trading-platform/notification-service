import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';
import { envSchema } from '../../src/config/schema.js';

describe('health routes', () => {
  const app = buildApp({ config: envSchema.parse({ NODE_ENV: 'test', LOG_LEVEL: 'fatal' }) });

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/live returns ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/health/live' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', service: 'notification-service' });
  });

  it('GET /health/ready returns ok when there are no dependencies yet', async () => {
    const response = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', checks: {} });
  });
});
