import 'dotenv/config';

import { ConfigError, parseConfig } from './parse.js';
import type { AppConfig } from './types.js';

function loadConfig(): AppConfig {
  try {
    return parseConfig(process.env);
  } catch (error) {
    if (error instanceof ConfigError) {
      // Logger is not created yet, so write straight to stderr and stop.
      console.error(error.message);
      process.exit(1);
    }

    throw error;
  }
}

export const config: AppConfig = loadConfig();
