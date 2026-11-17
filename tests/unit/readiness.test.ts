import { readdirSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';
import type { DbClient } from '../../src/infrastructure/database/client.js';
import { EXPECTED_MIGRATION_VERSION } from '../../src/infrastructure/database/migrations.js';
import type { RedisClient } from '../../src/infrastructure/redis/client.js';
import type { Component } from '../../src/roles.js';
import { testConfig } from '../fixtures/config.js';

type App = ReturnType<typeof buildApp>;

interface FakeDb {
  reachable?: boolean;
  migrationVersion?: number | null; // null = goose has never run
}

// Fake postgres.js tagged template: answers SELECT 1 and the goose version query.
function fakeDb({ reachable = true, migrationVersion = EXPECTED_MIGRATION_VERSION }: FakeDb = {}) {
  return (async (strings: TemplateStringsArray) => {
    if (!reachable) {
      throw new Error('connection refused');
    }

    if (strings.join('').includes('goose_db_version')) {
      if (migrationVersion === null) {
        throw new Error('relation "goose_db_version" does not exist');
      }

      return [{ version: String(migrationVersion) }];
    }

    return [{ '?column?': 1 }];
  }) as unknown as DbClient;
}

function fakeRedis(up = true) {
  return {
    ping: async () => {
      if (!up) {
        throw new Error('connection refused');
      }

      return 'PONG';
    },
  } as unknown as RedisClient;
}

function fakeConsumer(joined: boolean): Component {
  return {
    role: 'consumer',
    start: async () => {},
    stop: async () => {},
    readiness: { name: 'kafka', check: async () => joined },
  };
}

function appWith(db: DbClient, redis: RedisClient, components: Component[] = []): App {
  const app = buildApp({ config: testConfig(), components, registerInfrastructure: false });

  app.decorate('db', db);
  app.decorate('redis', redis);

  return app;
}

describe('GET /health/ready', () => {
  let app: App | undefined;

  afterEach(async () => {
    await app?.close();
  });

  async function ready(target: App) {
    app = target;
    const response = await target.inject({ method: 'GET', url: '/health/ready' });

    return { statusCode: response.statusCode, body: response.json() };
  }

  it('is ready when PostgreSQL is up, migrations are current and Redis is up', async () => {
    expect(await ready(appWith(fakeDb(), fakeRedis()))).toEqual({
      statusCode: 200,
      body: { status: 'ok', checks: { database: true, migrations: true, redis: true } },
    });
  });

  it('is not ready (503) when PostgreSQL is down', async () => {
    expect(await ready(appWith(fakeDb({ reachable: false }), fakeRedis()))).toEqual({
      statusCode: 503,
      body: { status: 'not_ready', checks: { database: false, migrations: false, redis: true } },
    });
  });

  it('is not ready when migrations are behind the expected version', async () => {
    const db = fakeDb({ migrationVersion: EXPECTED_MIGRATION_VERSION - 1 });

    const { statusCode, body } = await ready(appWith(db, fakeRedis()));

    expect(statusCode).toBe(503);
    expect(body.checks.migrations).toBe(false);
  });

  it('is not ready when migrations have never run', async () => {
    const { statusCode, body } = await ready(
      appWith(fakeDb({ migrationVersion: null }), fakeRedis()),
    );

    expect(statusCode).toBe(503);
    expect(body.checks).toMatchObject({ database: true, migrations: false });
  });

  it('stays ready when only Redis is down (fail open)', async () => {
    const { statusCode, body } = await ready(appWith(fakeDb(), fakeRedis(false)));

    expect(statusCode).toBe(200);
    expect(body.checks.redis).toBe(false);
  });

  it('is not ready until the consumer has joined its Kafka group', async () => {
    const { statusCode, body } = await ready(appWith(fakeDb(), fakeRedis(), [fakeConsumer(false)]));

    expect(statusCode).toBe(503);
    expect(body.checks.kafka).toBe(false);
  });

  it('is ready once the consumer has joined its Kafka group', async () => {
    const { statusCode, body } = await ready(appWith(fakeDb(), fakeRedis(), [fakeConsumer(true)]));

    expect(statusCode).toBe(200);
    expect(body.checks.kafka).toBe(true);
  });
});

describe('EXPECTED_MIGRATION_VERSION', () => {
  it('matches the newest migration file (update it when you add a migration)', () => {
    const versions = readdirSync('src/infrastructure/database/migrations')
      .filter((file) => file.endsWith('.sql'))
      .map((file) => Number(file.split('_')[0]));

    expect(EXPECTED_MIGRATION_VERSION).toBe(Math.max(...versions));
  });
});
