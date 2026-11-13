import type { ServiceRole } from '../../../config/schema.js';

export async function liveness(roles: readonly ServiceRole[]) {
  return {
    status: 'ok',
    service: 'notification-service',
    roles,
  };
}
