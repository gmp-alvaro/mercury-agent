import { Pool } from "pg";

type CreatorLookupResult =
  | { status: "missing_db_config" }
  | { status: "missing_creators_table" }
  | { status: "missing_recipient_column" }
  | { status: "not_found" }
  | { status: "ambiguous"; matches: string[] }
  | {
      status: "found";
      label: string;
      mercuryRecipientId: string | null;
    };

const DATABASE_URL = process.env.DATABASE_URL;

let pool: Pool | null = null;

function getPool(): Pool | null {
  if (!DATABASE_URL) {
    return null;
  }

  if (!pool) {
    pool = new Pool({ connectionString: DATABASE_URL });
  }

  return pool;
}

export async function findCreatorByName(
  name: string,
): Promise<CreatorLookupResult> {
  const db = getPool();
  if (!db) {
    return { status: "missing_db_config" };
  }

  try {
    const result = await db.query<{
      label: string;
      mercury_recipient_id: string | null;
    }>(
      `SELECT
         COALESCE(
           NULLIF(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), ''),
           tiktok_display_name,
           tiktok_username,
           email,
           'unknown creator'
         ) AS label,
         mercury_recipient_id AS mercury_recipient_id
       FROM public.creators
       WHERE
         LOWER(first_name) = LOWER($1)
         OR LOWER(last_name) = LOWER($1)
         OR LOWER(tiktok_display_name) = LOWER($1)
         OR LOWER(tiktok_username) = LOWER($1)
         OR LOWER(email) = LOWER($1)
         OR LOWER(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))) = LOWER($1)
       LIMIT 3`,
      [name],
    );

    if (result.rows.length === 0) {
      return { status: "not_found" };
    }

    if (result.rows.length > 1) {
      return {
        status: "ambiguous",
        matches: result.rows.map(
          (row: { label: string; mercury_recipient_id: string | null }) =>
            row.label,
        ),
      };
    }

    const row = result.rows[0];
    return {
      status: "found",
      label: row.label,
      mercuryRecipientId: row.mercury_recipient_id,
    };
  } catch (error) {
    if ((error as { code?: string }).code === "42703") {
      return {
        status: "missing_recipient_column",
      };
    }

    if ((error as { code?: string }).code !== "42P01") {
      throw error;
    }

    return {
      status: "missing_creators_table",
    };
  }
}
