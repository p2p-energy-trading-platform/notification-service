import type { z } from 'zod';

import { envSchema } from './schema.js';
import type { AppConfig } from './types.js';

export class ConfigError extends Error {
  constructor(readonly problems: string[]) {
    super(`Invalid environment configuration:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    this.name = 'ConfigError';
  }
}

function describeIssue(issue: z.core.$ZodIssue): string {
  const variable = issue.path.join('.') || '(environment)';

  return `${variable}: ${issue.message}`;
}

// Validates raw environment variables. Throws ConfigError naming every bad variable.
export function parseConfig(env: Record<string, string | undefined>): AppConfig {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    throw new ConfigError(result.error.issues.map(describeIssue));
  }

  return result.data;
}
