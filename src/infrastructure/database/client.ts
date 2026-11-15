import postgres from 'postgres';

export const DATABASE_SCHEMA = 'notification_data';

export type DbClient = postgres.Sql;

interface DbClientOptions {
  databaseUrl: string;
  max: number;
  idleTimeout: number;
  connectTimeout: number;
  onNotice: (notice: postgres.Notice) => void;
}

export function createDbClient(options: DbClientOptions): DbClient {
  return postgres(options.databaseUrl, {
    max: options.max,
    idle_timeout: options.idleTimeout,
    connect_timeout: options.connectTimeout,
    onnotice: options.onNotice,

    // Pin every connection to our schema, so nothing is read from or written to another one.
    connection: {
      application_name: 'notification-service',
      search_path: DATABASE_SCHEMA,
    },
  });
}

interface ConnectionInfo {
  user: string;
  schema: string | null;
}

// Checks the connection works and uses the notification_data schema.
export async function verifyConnection(sql: DbClient): Promise<ConnectionInfo> {
  const [row] = await sql<
    ConnectionInfo[]
  >`SELECT current_user AS user, current_schema() AS schema`;

  if (!row || row.schema !== DATABASE_SCHEMA) {
    throw new Error(
      `Expected schema "${DATABASE_SCHEMA}" but got "${row?.schema ?? 'none'}". ` +
        'Check DATABASE_URL uses NOTIFICATION_SERVICE_USER and that gridx-infra created the schema.',
    );
  }

  return row;
}
