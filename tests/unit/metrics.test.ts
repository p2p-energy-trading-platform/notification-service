import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';
import { testConfig } from '../fixtures/config.js';

describe('GET /metrics', () => {
  const app = buildApp({ config: testConfig(), components: [], registerInfrastructure: false });

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns Prometheus metrics in text format', async () => {
    const response = await app.inject({ method: 'GET', url: '/metrics' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.body).toContain('process_cpu_user_seconds_total');
  });

  it('counts HTTP requests by route and status code', async () => {
    await app.inject({ method: 'GET', url: '/health/live' });

    const response = await app.inject({ method: 'GET', url: '/metrics' });

    expect(response.body).toMatch(
      /notification_http_requests_total\{method="GET",route="\/health\/live",status_code="200"\} \d+/,
    );
    expect(response.body).toContain('notification_http_request_duration_seconds_bucket');
  });
});
