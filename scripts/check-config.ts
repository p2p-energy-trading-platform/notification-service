// Validates the environment (.env + process env) without starting the service.
// Exits with code 1 and lists every invalid variable if something is wrong.
import { config } from '../src/config/env.js';

console.log(
  `Notification Service environment configuration is valid (NODE_ENV=${config.NODE_ENV}).`,
);
