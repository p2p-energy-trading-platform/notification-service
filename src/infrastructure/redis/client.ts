import { createClient } from 'redis';

interface RedisClientOptions {
  url: string;
  onError?: (err: Error) => void;
}

export function createRedisClient(options: RedisClientOptions) {
  const client = createClient({
    url: options.url,
    disableOfflineQueue: true,

    socket: {
      connectTimeout: 5_000,
      reconnectStrategy: (retries) => Math.min(retries * 200, 5_000),
    },
  });

  if (options.onError) {
    client.on('error', options.onError);
  }

  return client;
}

export type RedisClient = ReturnType<typeof createRedisClient>;
