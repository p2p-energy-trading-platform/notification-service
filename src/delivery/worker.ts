import type { FastifyBaseLogger } from 'fastify';

import type { Component } from '../roles.js';

// Placeholder: claims delivery jobs and sends them
export function createDeliveryWorker(log: FastifyBaseLogger): Component {
  return {
    role: 'worker',

    async start() {
      log.info({ role: 'worker' }, 'Worker role started (delivery worker not implemented yet)');
    },

    async stop() {
      log.info({ role: 'worker' }, 'Worker role stopped');
    },
  };
}
