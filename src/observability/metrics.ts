import { Counter, Histogram, Registry, collectDefaultMetrics } from '@prometheus-io/client';

export const metricsRegistry = new Registry();

// Node.js process metrics: CPU, memory, event loop lag, GC.
collectDefaultMetrics({
  register: metricsRegistry,
});

export const httpRequestsTotal = new Counter({
  name: 'notification_http_requests_total',
  help: 'Total HTTP requests handled by the notification service',
  labelNames: ['method', 'route', 'status_code'],
  registers: [metricsRegistry],
});

export const httpRequestDuration = new Histogram({
  name: 'notification_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  registers: [metricsRegistry],
});
