import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../src/app.js';
import { envSchema } from '../../src/config/schema.js';
import type { Component } from '../../src/roles.js';
import { createShutdown } from '../../src/shutdown.js';

const log = buildApp({ config: envSchema.parse({ LOG_LEVEL: 'fatal' }), components: [] }).log;

function fakeApp(close: () => Promise<unknown>) {
  return { log, close: vi.fn<() => Promise<unknown>>(close) };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('createShutdown', () => {
  it('closes the app and exits 0', async () => {
    const app = fakeApp(async () => undefined);
    const exit = vi.fn<(code: number) => void>();

    await createShutdown({ app, timeoutMs: 1000, exit })('SIGTERM');

    expect(app.close).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledExactlyOnceWith(0);
  });

  it('exits 1 when closing fails', async () => {
    const app = fakeApp(async () => {
      throw new Error('boom');
    });
    const exit = vi.fn<(code: number) => void>();

    await createShutdown({ app, timeoutMs: 1000, exit })('SIGTERM');

    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('forces exit 1 when in-flight work does not finish in time', async () => {
    vi.useFakeTimers();

    const app = fakeApp(() => new Promise(() => {})); // never finishes
    const exit = vi.fn<(code: number) => void>();

    void createShutdown({ app, timeoutMs: 8000, exit })('SIGTERM');

    await vi.advanceTimersByTimeAsync(7999);
    expect(exit).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('ignores a second signal while shutting down', async () => {
    const app = fakeApp(async () => undefined);
    const exit = vi.fn<(code: number) => void>();
    const shutdown = createShutdown({ app, timeoutMs: 1000, exit });

    await Promise.all([shutdown('SIGTERM'), shutdown('SIGINT')]);

    expect(app.close).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledOnce();
  });
});

describe('graceful shutdown of the app', () => {
  it('finishes an in-flight request before closing, and rejects new ones', async () => {
    const app = buildApp({ config: envSchema.parse({ LOG_LEVEL: 'fatal' }), components: [] });

    let finishRequest!: () => void;
    app.get('/slow', async () => {
      await new Promise<void>((resolve) => (finishRequest = resolve));
      return { done: true };
    });

    await app.listen({ host: '127.0.0.1', port: 0 });
    const address = app.addresses()[0];
    const url = `http://127.0.0.1:${address?.port}`;

    const inFlight = fetch(`${url}/slow`);
    await vi.waitFor(() => expect(finishRequest).toBeTypeOf('function'));

    const closing = app.close();

    // New work is refused: the server no longer accepts connections.
    await vi.waitFor(() => expect(app.server.listening).toBe(false));

    finishRequest();
    const response = await inFlight;
    expect(response.status).toBe(200);
    expect(response.headers.get('connection')).toBe('close');
    expect(await response.json()).toEqual({ done: true });

    await closing;
  });

  it('stops the consumer before the worker, after HTTP has closed', async () => {
    const events: string[] = [];
    const component = (role: Component['role']): Component => ({
      role,
      start: async () => void events.push(`start ${role}`),
      stop: async () => void events.push(`stop ${role}`),
    });

    const app = buildApp({
      config: envSchema.parse({ LOG_LEVEL: 'fatal' }),
      components: [component('consumer'), component('worker')],
    });

    await app.ready();
    await app.close();

    expect(events).toEqual(['start consumer', 'start worker', 'stop consumer', 'stop worker']);
  });
});
