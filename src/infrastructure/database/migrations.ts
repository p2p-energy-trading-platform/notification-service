import type { DbClient } from './client.js';

// Version of the newest file in ./migrations. The service is only ready when the database
// is at least at this version. A unit test fails if a new migration is added without
// updating this value.
export const EXPECTED_MIGRATION_VERSION = 20261115100800;

// Latest applied goose version. Throws if goose has never run (no goose_db_version table).
export async function currentMigrationVersion(sql: DbClient): Promise<number> {
  const [row] = await sql<{ version: string | null }[]>`
    SELECT MAX(version_id)::text AS version FROM goose_db_version WHERE is_applied
  `;

  return Number(row?.version ?? 0);
}
