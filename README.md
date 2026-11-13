# Notification Service

The **GridX Notification Service** tells users what happened on the P2P Energy Trading Platform.

Other services (Matching Engine, IoT Ingestion, Auth, and later Billing/Wallet) publish **domain events** to Kafka. They do not know about users' devices, email addresses or preferences. The Notification Service turns those events into notifications and delivers them.

It is responsible for:

- Consuming domain events from Kafka (trades, order updates, device status, grid rules)
- Deciding who to notify, based on user preferences
- Storing every notification in the user's inbox (PostgreSQL)
- Delivering notifications by in-app (real-time), email and mobile push
- Retries, rate limits and de-duplication
- The inbox API: list, unread count, mark as read

> **Status: skeleton.** The service starts, validates its config, serves health endpoints and shuts down gracefully. The Kafka consumer, delivery worker, database and channels are placeholders and are added in later tickets.

The full design lives in the docs repository under `plans/notification/` (requirements, architecture, event catalog, data model, channels and the implementation plan).

## 1. Architecture

```text
   Matching Engine   IoT Ingestion   Auth Service
          │                │              │
          └────────────────┼──────────────┘
                           │ Kafka (trade.executed, order.state, ...)
                           ▼
              ┌─────────────────────────┐
              │  Notification Service   │
              │  Fastify / TypeScript   │
              │                         │
              │  consumer → PostgreSQL  │
              │  worker   → channels    │
              │  api      → inbox API   │
              └──┬─────────┬─────────┬──┘
                 │         │         │
            PostgreSQL   Redis    Email / Push / Kafka
            (inbox,     (rate     (in-app via API Gateway
             job queue)  limits)   WebSocket)
```

### 1.1 Service roles

One codebase and one Docker image can run as three kinds of process. `SERVICE_ROLES` chooses which parts start:

| Role | What it does |
|---|---|
| `api` | HTTP / gRPC: inbox API and provider webhooks |
| `consumer` | Reads Kafka events, creates notifications and delivery jobs in PostgreSQL |
| `worker` | Claims delivery jobs and sends them (email, push, in-app) |

The default is all three in one process (`SERVICE_ROLES=api,consumer,worker`), which is what you want for local development. In production each role can run as its own container and scale on its own, for example more workers when emails pile up.

Health endpoints run in **every** role, so Docker can check any process.

### 1.2 Graceful shutdown

On `SIGTERM` (`docker stop`, redeploy) or `SIGINT` (Ctrl+C) the service:

1. Stops accepting new HTTP connections.
2. Finishes in-flight requests (responses get `Connection: close`).
3. Stops the consumer, then the worker, so they finish the work they already started.
4. Exits with code `0`, or `1` if something failed.

If this takes longer than `SHUTDOWN_TIMEOUT_MS` (default 8 s), the service logs `Shutdown timed out` and exits with code `1`. Keep this value below the container stop timeout (Docker default: 10 s).

## 2. Repository structure

The service follows the same feature/infrastructure/transport split as `auth-service`:

```text
notification-service/
├── src/
│   ├── main.ts                 # Entry point: load config, start, handle signals
│   ├── app.ts                  # buildApp(): Fastify, routes, role components
│   ├── roles.ts                # SERVICE_ROLES → consumer / worker components
│   ├── shutdown.ts             # Graceful shutdown with timeout
│   │
│   ├── config/
│   │   ├── env.ts              # Loads .env and validates, exits on error
│   │   ├── parse.ts            # parseConfig(), ConfigError
│   │   ├── schema.ts           # zod schema for every variable
│   │   └── types.ts
│   │
│   ├── consumer/
│   │   └── kafka-consumer.ts   # Placeholder: Kafka consumer (consumer role)
│   │
│   ├── delivery/
│   │   └── worker.ts           # Placeholder: delivery worker (worker role)
│   │
│   ├── observability/
│   │   └── logging.ts          # Pino options and redaction
│   │
│   ├── transport/
│   │   └── http/
│   │       ├── routes.ts
│   │       └── health/
│   │           ├── routes.ts
│   │           ├── liveness.ts
│   │           └── readiness.ts
│   │
│   └── types/
│       └── fastify.d.ts
│
├── tests/
│   └── unit/
│
├── scripts/
│   └── check-config.ts
│
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

The structure will grow as features are added (`features/`, `templates/`, `jobs/`, `infrastructure/`, ...). New code should keep the separation:

- `consumer/` reads Kafka events and turns them into notifications.
- `delivery/` sends notifications through the channels.
- `features/` contains business logic (notifications, preferences, devices).
- `transport/` contains HTTP / gRPC concerns.
- `infrastructure/` contains PostgreSQL, Redis, Kafka and provider clients.
- `observability/` contains logs, metrics and tracing.

## 3. Prerequisites

### Required

- Git
- Node.js **24 or newer**
- npm
- Docker Engine
- Docker Compose
- `gridx-workspace` setup (configure the gridx-workspace repo before running the project)

## 4. Clone and install

Make sure the gridx-workspace is set up with the latest changes from the main branch and all repos have been pulled locally. To pull all latest changes or missing repos, run the following from `gridx-workspace`:

```bash
go-task setup
```

or

```bash
task setup
```

Install dependencies:

```bash
npm install
```

## 5. Configure the environment

Create your local environment file:

```bash
cp .env.example .env
```

Every variable is documented in `.env.example`:

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | `development`, `test` or `production` |
| `SERVICE_ROLES` | `api,consumer,worker` | Which parts run in this process (see [1.1](#11-service-roles)) |
| `HTTP_HOST` | `0.0.0.0` | HTTP listen address |
| `HTTP_PORT` | `3000` | HTTP port (health, metrics, webhooks) |
| `SHUTDOWN_TIMEOUT_MS` | `8000` | Max time to finish in-flight work on shutdown |
| `LOG_LEVEL` | `info` | `fatal`, `error`, `warn`, `info`, `debug` or `trace` |

The config is validated with zod at startup. If a variable is missing or invalid, the service does not start and prints every problem by name:

```text
Invalid environment configuration:
  - HTTP_PORT: Invalid input: expected number, received NaN
  - SERVICE_ROLES: Invalid option: expected one of "api"|"consumer"|"worker"
```

Check your config without starting the service:

```bash
npm run check-config
```

## 6. Running the project

In the `gridx-workspace` directory, run the following to start the entire project along with notification-service:

```bash
go-task up
```

or

```bash
task up
```

To rebuild only `notification-service` while the stack is running in Docker:

```bash
go-task build -- notification-service
```

or

```bash
task build -- notification-service
```

You can also run the service locally (make sure it is not also running as a Docker container under `gridx-workspace`).

With hot reload:

```bash
npm run dev
```

Or build and start:

```bash
npm run build
npm run start
```

Check that it is running:

```bash
curl localhost:3000/health/live
# {"status":"ok","service":"notification-service","roles":["api","consumer","worker"]}
```

## 7. HTTP endpoints

| Endpoint | Description |
|---|---|
| `GET /health/live` | The process is running. Also returns the active roles |
| `GET /health/ready` | Ready to take work. Returns `503` if a dependency is down. PostgreSQL, Redis and Kafka checks are added with those clients |

## 8. Logging

Logs are JSON (Pino) on stdout. Set the level with `LOG_LEVEL`.

Personal data is never logged. Log `user_id`, `notification_id` and `delivery_id` instead. Email addresses, push tokens, message bodies and auth headers are redacted as `[REDACTED]` (see `src/observability/logging.ts`).

## 9. Development checks before opening a PR

Run everything CI runs (lint, typecheck, test, build):

```bash
npm run check
```

Or run each step:

```bash
npm run check-config
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

CI (`.github/workflows/ci.yml`) runs lint, format check, typecheck, test and build on every pull request.

## 10. Formatting and linting

The project uses **oxlint** and **oxfmt**, the same as `auth-service` and `api-gateway`.

Automatically fix lint findings:

```bash
npm run lint:fix
```

Format source, tests and scripts:

```bash
npm run format
```

Check formatting without changing files:

```bash
npm run format:check
```

## 11. Testing

Tests use **Vitest** and live in `tests/`:

```bash
npm test            # run once
npm run test:watch  # watch mode
```

Integration tests with Testcontainers (PostgreSQL, Redis, Kafka) are added together with those clients.
