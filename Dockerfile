FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm pkg delete scripts.prepare && npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build


# One-off migration runner: applies goose migrations, then exits.
FROM alpine:3.22 AS migrate

ARG GOOSE_VERSION=v3.28.0
ARG TARGETARCH

RUN apk add --no-cache curl \
    && case "${TARGETARCH}" in \
         amd64) GOOSE_ARCH=x86_64 ;; \
         arm64) GOOSE_ARCH=arm64 ;; \
         *) echo "Unsupported architecture: ${TARGETARCH}" && exit 1 ;; \
       esac \
    && curl -fsSL -o /usr/local/bin/goose \
         "https://github.com/pressly/goose/releases/download/${GOOSE_VERSION}/goose_linux_${GOOSE_ARCH}" \
    && chmod +x /usr/local/bin/goose \
    && apk del curl

COPY src/infrastructure/database/migrations /migrations

USER nobody

CMD ["sh", "-c", "goose -dir /migrations postgres \"$DATABASE_URL\" up"]


FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm pkg delete scripts.prepare && npm ci --omit=dev

COPY --from=build /app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
