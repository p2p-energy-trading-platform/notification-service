export async function liveness() {
  return {
    status: 'ok',
    service: 'notification-service',
  };
}
