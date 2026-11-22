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

  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),

  KAFKA_BROKERS: z
    .string()
    .default('localhost:9092')
    .transform((value) =>
      value
        .split(',')
        .map((broker) => broker.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string()).min(1, 'at least one broker is required')),
  KAFKA_CLIENT_ID: z.string().min(1).default('notification-service'),
  KAFKA_GROUP_ID: z.string().min(1).default('notification-service'),
  KAFKA_TRADE_EXECUTED_TOPIC: z.string().min(1).default('trade.executed'),
  KAFKA_ORDER_STATE_TOPIC: z.string().min(1).default('order.state'),
  KAFKA_DLQ_TOPIC: z.string().min(1).default('notification.dlq.v1'),

  HTTP_HOST: z.string().default('0.0.0.0'),
  HTTP_PORT: z.coerce.number().int().positive().default(3000),

  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;
