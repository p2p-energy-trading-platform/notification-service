import type { FastifyBaseLogger } from 'fastify';

import type { ServiceRole } from './config/schema.js';
import { createKafkaConsumer } from './consumer/kafka-consumer.js';
import { createDeliveryWorker } from './delivery/worker.js';

export interface Component {
  readonly role: ServiceRole;
  start(): Promise<void>;
  stop(): Promise<void>;
}

// Builds the background components for the enabled roles.
// The 'api' role has no component: it controls which HTTP/gRPC routes are registered.
export function createRoleComponents(
  roles: readonly ServiceRole[],
  log: FastifyBaseLogger,
): Component[] {
  const components: Component[] = [];

  if (roles.includes('consumer')) {
    components.push(createKafkaConsumer(log));
  }

  if (roles.includes('worker')) {
    components.push(createDeliveryWorker(log));
  }

  return components;
}
