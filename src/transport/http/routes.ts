import type { FastifyPluginAsync } from 'fastify';

import healthRoutes from './health/routes.js';

const httpRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(healthRoutes);
};

export default httpRoutes;
