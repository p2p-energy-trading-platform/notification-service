import { z } from 'zod';

export const SERVICE_ROLES = ['api', 'consumer', 'worker'] as const;

export type ServiceRole = (typeof SERVICE_ROLES)[number];

const serviceRolesFromEnv = z
  .string()
  .default(SERVICE_ROLES.join(','))
  .transform((value) => [
    ...new Set(
      value
        .split(',')
        .map((role) => role.trim())
        .filter(Boolean),
    ),
  ])
  .pipe(z.array(z.enum(SERVICE_ROLES)).min(1, 'at least one role is required'));

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  SERVICE_ROLES: serviceRolesFromEnv,

  HTTP_HOST: z.string().default('0.0.0.0'),
  HTTP_PORT: z.coerce.number().int().positive().default(3000),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;
