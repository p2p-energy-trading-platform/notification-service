# Notification Service

The **GridX Notification Service** sends notifications to users of the P2P Energy Trading Platform.

It is responsible for:

- Consuming domain events from Kafka (trades, order updates, device status, grid rules)
- Choosing who to notify based on user preferences
- Storing notifications in the user's inbox
- Delivering notifications by in-app, email and mobile push
- Retries, rate limits and de-duplication
- The inbox API (list, unread count, mark as read)

## 1. Architecture

```text
   Matching Engine   IoT Ingestion   Auth Service
          │                │              │
          └────────────────┼──────────────┘
                           │ Kafka
                           ▼
              ┌─────────────────────────┐
              │  Notification Service   │
              │  Fastify / TypeScript   │
              └──┬─────────┬─────────┬──┘
                 │         │         │
            PostgreSQL   Redis    Email / Push / In-app
```

Other services publish events to Kafka. The Notification Service turns them into notifications, stores them in PostgreSQL and delivers them through the user's channels.

The full design is in the docs repository under `plans/notification/`.

## 2. Repository structure

```text
notification-service/
├── src/
│   ├── config/           # Environment config and validation
│   ├── consumer/         # Kafka consumer and event handlers
│   ├── delivery/         # Delivery worker and channels
│   ├── features/         # Business logic
│   ├── transport/        # HTTP and gRPC
│   ├── infrastructure/   # PostgreSQL, Redis, Kafka and provider clients
│   ├── observability/    # Logging, metrics and tracing
│   ├── app.ts
│   └── main.ts
├── tests/
├── scripts/
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── package.json
```

## 3. Prerequisites

- Git
- Node.js **24 or newer**
- npm
- Docker Engine
- Docker Compose
- `gridx-workspace` setup (configure the gridx-workspace repo before running the project)

## 4. Clone and install

Make sure the gridx-workspace is set up with the latest changes from the main branch and all repos have been pulled locally. From `gridx-workspace`, run:

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

Every variable is described in `.env.example`. The config is validated at startup, and the service will not start if a value is missing or invalid.

Check your config without starting the service:

```bash
npm run check-config
```

## 6. Running the project

In the `gridx-workspace` directory, start the entire project along with notification-service:

```bash
go-task up
```

or

```bash
task up
```

To rebuild only `notification-service` while it is running in Docker:

```bash
go-task build -- notification-service
```

or

```bash
task build -- notification-service
```

You can also run the service locally (make sure it is not also running as a Docker container):

```bash
npm run dev
```

or

```bash
npm run build
npm run start
```

Health check:

```bash
curl localhost:3000/health/live
```

## 7. Development checks before opening a PR

Run everything CI runs:

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

## 8. Formatting and linting

Automatically fix lint findings:

```bash
npm run lint:fix
```

Format the code:

```bash
npm run format
```

Check formatting without changing files:

```bash
npm run format:check
```

## 9. Commit messages

Commit messages are checked by commitlint (Husky `commit-msg` hook). Use Conventional Commits:

```text
<type>(<optional scope>): <summary>
```

Allowed types: `feat`, `fix`, `doc`, `style`, `refactor`, `perf`, `test`, `chore`, `remove`.

```bash
git commit -m "feat(consumer): handle trade events"
```
