import { describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';
import { testConfig } from '../fixtures/config.js';
import { ConfigError, parseConfig } from '../../src/config/parse.js';
import { type Component, createRoleComponents } from '../../src/roles.js';

const requiredEnv = {
  DATABASE_URL: 'postgres://test:test@localhost:5432/test',
  REDIS_URL: 'redis://localhost:6379',
};

const silentLog = buildApp({
  config: testConfig(),
  components: [],
  registerInfrastructure: false,
}).log;

function rolesOf(components: Component[]) {
  return components.map((c) => c.role);
}

describe('SERVICE_ROLES config', () => {
  it('defaults to all three roles', () => {
    expect(parseConfig({ ...requiredEnv }).SERVICE_ROLES).toEqual(['api', 'consumer', 'worker']);
  });

  it('parses a comma separated list with spaces and duplicates', () => {
    expect(
      parseConfig({ ...requiredEnv, SERVICE_ROLES: ' worker, api ,worker' }).SERVICE_ROLES,
    ).toEqual(['worker', 'api']);
  });

  it.each([['scheduler'], [''], [' , ']])('rejects %j and names SERVICE_ROLES', (value) => {
    expect(() => parseConfig({ ...requiredEnv, SERVICE_ROLES: value })).toThrow(ConfigError);
    expect(() => parseConfig({ ...requiredEnv, SERVICE_ROLES: value })).toThrow(/SERVICE_ROLES: /);
  });
});

describe('createRoleComponents', () => {
  it('creates a consumer and a worker for all roles', () => {
    expect(rolesOf(createRoleComponents(['api', 'consumer', 'worker'], silentLog))).toEqual([
      'consumer',
      'worker',
    ]);
  });

  it('creates nothing for the api role alone', () => {
    expect(createRoleComponents(['api'], silentLog)).toEqual([]);
  });

  it('creates only the worker for the worker role', () => {
    expect(rolesOf(createRoleComponents(['worker'], silentLog))).toEqual(['worker']);
  });
});

describe('component lifecycle', () => {
  it('starts components on ready and stops them on close', async () => {
    const events: string[] = [];

    const fake: Component = {
      role: 'worker',
      start: async () => void events.push('start'),
      stop: async () => void events.push('stop'),
    };

    const app = buildApp({
      config: testConfig({ SERVICE_ROLES: 'worker' }),
      components: [fake],
      registerInfrastructure: false,
    });

    await app.ready();
    expect(events).toEqual(['start']);

    await app.close();
    expect(events).toEqual(['start', 'stop']);
  });
});
