import { describe, expect, it } from 'vitest';

import { ConfigError, parseConfig } from '../../src/config/parse.js';

const requiredEnv = {
  DATABASE_URL: 'postgres://test:test@localhost:5432/test',
  REDIS_URL: 'redis://localhost:6379',
};

function problemsFor(env: Record<string, string | undefined>): string[] {
  try {
    parseConfig({ ...requiredEnv, ...env });
  } catch (error) {
    if (error instanceof ConfigError) {
      return error.problems;
    }

    throw error;
  }

  throw new Error('Expected parseConfig to throw');
}

describe('parseConfig', () => {
  it('uses defaults when optional variables are missing', () => {
    expect(parseConfig({ ...requiredEnv })).toEqual({
      NODE_ENV: 'development',
      DATABASE_URL: 'postgres://test:test@localhost:5432/test',
      REDIS_URL: 'redis://localhost:6379',
      SERVICE_ROLES: ['api', 'consumer', 'worker'],
      HTTP_HOST: '0.0.0.0',
      HTTP_PORT: 3000,
      SHUTDOWN_TIMEOUT_MS: 8000,
      LOG_LEVEL: 'info',
    });
  });

  it('converts HTTP_PORT from string to number', () => {
    expect(parseConfig({ ...requiredEnv, HTTP_PORT: '8080' }).HTTP_PORT).toBe(8080);
  });

  it('names the variable when a value is invalid', () => {
    const problems = problemsFor({ HTTP_PORT: 'abc' });

    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^HTTP_PORT: /);
  });

  it('reports every invalid variable at once', () => {
    const problems = problemsFor({ HTTP_PORT: '-1', LOG_LEVEL: 'loud', NODE_ENV: 'staging' });

    expect(problems.map((p) => p.split(':')[0]).toSorted()).toEqual([
      'HTTP_PORT',
      'LOG_LEVEL',
      'NODE_ENV',
    ]);
  });

  it('puts every problem in the error message', () => {
    expect(() => parseConfig({ ...requiredEnv, LOG_LEVEL: 'loud' })).toThrow(/LOG_LEVEL: /);
  });

  it('requires DATABASE_URL and REDIS_URL', () => {
    let problems: string[] = [];

    try {
      parseConfig({});
    } catch (error) {
      if (error instanceof ConfigError) {
        problems = error.problems;
      }
    }

    expect(problems.map((p) => p.split(':')[0]).toSorted()).toEqual(['DATABASE_URL', 'REDIS_URL']);
  });
});
