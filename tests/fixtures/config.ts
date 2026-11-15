import { envSchema } from '../../src/config/schema.js';
import type { AppConfig } from '../../src/config/types.js';

// Minimum valid environment for tests. Nothing connects to these URLs in unit tests.
export const testEnv = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'fatal',
  DATABASE_URL: 'postgres://test:test@localhost:5432/test',
  REDIS_URL: 'redis://localhost:6379',
} as const;

export function testConfig(env: Record<string, string> = {}): AppConfig {
  return envSchema.parse({ ...testEnv, ...env });
}
