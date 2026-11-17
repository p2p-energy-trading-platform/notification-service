import type { FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

import {
  httpRequestDuration,
  httpRequestsTotal,
  metricsRegistry,
} from '../observability/metrics.js';

export default fp(async (fastify) => {
  const starts = new WeakMap<FastifyRequest, bigint>();

  fastify.addHook('onRequest', async (request) => {
    starts.set(request, process.hrtime.bigint());
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const start = starts.get(request);

    if (!start) {
      return;
    }

    const elapsedSeconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;

    // Use the route pattern (/notifications/:id), not the raw URL, to keep label values few.
    const route = request.routeOptions.url ?? 'unknown';

    httpRequestsTotal.inc({
      method: request.method,
      route,
      status_code: String(reply.statusCode),
    });

    httpRequestDuration.observe({ method: request.method, route }, elapsedSeconds);
  });

  // Prometheus scrape endpoint.
  fastify.get('/metrics', async (_request, reply) => {
    reply.type(metricsRegistry.contentType).send(await metricsRegistry.metrics());
  });
});
