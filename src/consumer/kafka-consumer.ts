import type { FastifyBaseLogger } from 'fastify';

import type { Component } from '../roles.js';

// Placeholder: reads Kafka events and creates notifications 
export function createKafkaConsumer(log: FastifyBaseLogger): Component {
  return {
    role: 'consumer',

    async start() {
      log.info({ role: 'consumer' }, 'Consumer role started (Kafka consumer not implemented yet)');
    },

    async stop() {
      log.info({ role: 'consumer' }, 'Consumer role stopped');
    },
  };
}
