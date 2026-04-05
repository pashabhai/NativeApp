import * as SQLite from 'expo-sqlite';

const DB_NAME = 'nativeapp.db';
const TABLE_NAME = 'mynative_req';
const LANG_MAPPING_TABLE = 'lang_mapping';
const USER_PROFILE_TABLE = 'user_profile';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
}

export async function initDb() {
  const db = await getDb();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_text TEXT NOT NULL,
      response_text TEXT,
      word_type TEXT,
      version TEXT,
      fav INTEGER NOT NULL DEFAULT 0,
      "delete" INTEGER NOT NULL DEFAULT 0,
      comments TEXT,
      mapping_id INTEGER,
      created_ts TEXT NOT NULL,
      updated_ts TEXT NOT NULL,
      FOREIGN KEY (mapping_id) REFERENCES ${LANG_MAPPING_TABLE}(id)
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${LANG_MAPPING_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_lang TEXT,
      target_lang TEXT,
      comments TEXT,
      encode TEXT,
      created_ts TEXT NOT NULL,
      updated_ts TEXT NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${USER_PROFILE_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      icon TEXT,
      birth_year INTEGER,
      student INTEGER NOT NULL DEFAULT 0,
      username TEXT,
      country TEXT,
      state TEXT,
      city TEXT,
      zipcode TEXT,
      created_ts TEXT NOT NULL,
      updated_ts TEXT NOT NULL
    );
  `);

  const today = new Date().toISOString().split('T')[0];
  await db.runAsync(
    `INSERT INTO ${LANG_MAPPING_TABLE} (source_lang, target_lang, comments, encode, created_ts, updated_ts)
     SELECT ?, ?, ?, ?, ?, ?
     WHERE NOT EXISTS (
       SELECT 1
       FROM ${LANG_MAPPING_TABLE}
       WHERE source_lang = ? AND target_lang = ? AND encode = ?
     );`,
    'english',
    'Marathi',
    'Default mapping',
    'utf-8',
    today,
    today,
    'english',
    'Marathi',
    'utf-8',
  );
}

export async function saveUserRequest(requestText: string, responseText: string) {
  const db = await getDb();
  const mappingRows = await db.getAllAsync<{ id: number }>(
    `SELECT id FROM ${LANG_MAPPING_TABLE}
     WHERE source_lang = ? AND target_lang = ? AND encode = ?
     LIMIT 1;`,
    'english',
    'Marathi',
    'utf-8',
  );
  const defaultMappingId = mappingRows[0]?.id ?? null;
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO ${TABLE_NAME}
     (request_text, response_text, word_type, version, fav, "delete", comments, mapping_id, created_ts, updated_ts)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    requestText,
    responseText,
    'unknown',
    '1.0',
    0,
    0,
    'Auto-saved request',
    defaultMappingId,
    now,
    now,
  );
}

export type RecentRequest = {
  id: number;
  request_text: string;
  response_text: string | null;
  version: string | null;
  created_ts: string;
};

export async function getRecentRequests(limit = 10): Promise<RecentRequest[]> {
  const db = await getDb();
  return db.getAllAsync<RecentRequest>(
    `SELECT t.id, t.request_text, t.response_text, t.version, t.created_ts
     FROM ${TABLE_NAME} t
     INNER JOIN (
       SELECT lower(trim(request_text)) AS req_key, MAX(id) AS max_id
       FROM ${TABLE_NAME}
       WHERE "delete" = 0
       GROUP BY lower(trim(request_text))
     ) latest ON latest.max_id = t.id
     ORDER BY t.id DESC
     LIMIT ?;`,
    limit,
  );
}

export async function createNextVersionForRequest(requestText: string, responseText: string) {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    word_type: string | null;
    mapping_id: number | null;
    version: string | null;
  }>(
    `SELECT word_type, mapping_id, version
     FROM ${TABLE_NAME}
     WHERE "delete" = 0 AND lower(trim(request_text)) = lower(trim(?))
     ORDER BY id DESC;`,
    requestText,
  );

  const latest = rows[0] ?? null;
  const currentMaxVersion = rows.reduce((max, row) => {
    const parsed = Number.parseFloat(row.version ?? '0');
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
  }, 0);
  const nextVersion = (currentMaxVersion + 1).toString();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO ${TABLE_NAME}
     (request_text, response_text, word_type, version, fav, "delete", comments, mapping_id, created_ts, updated_ts)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    requestText,
    responseText,
    latest?.word_type ?? 'unknown',
    nextVersion,
    0,
    0,
    'Auto-saved refresh version',
    latest?.mapping_id ?? null,
    now,
    now,
  );
}

export async function deleteRecentRequest(id: number) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE ${TABLE_NAME}
     SET "delete" = 1, updated_ts = ?
     WHERE id = ?;`,
    new Date().toISOString(),
    id,
  );
}

export async function getRecentTargetResponses(limit = 200): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ response_text: string | null }>(
    `SELECT response_text
     FROM ${TABLE_NAME}
     WHERE "delete" = 0 AND response_text IS NOT NULL
     ORDER BY id DESC
     LIMIT ?;`,
    limit,
  );
  return rows.map((row) => row.response_text ?? '').filter(Boolean);
}

export async function getDefaultTargetLanguage(): Promise<string> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ target_lang: string | null }>(
    `SELECT target_lang
     FROM ${LANG_MAPPING_TABLE}
     WHERE source_lang = ? AND encode = ?
     ORDER BY id ASC
     LIMIT 1;`,
    'english',
    'utf-8',
  );
  return (rows[0]?.target_lang ?? 'target').trim() || 'target';
}

export async function getSavedResponseForRequest(requestText: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ response_text: string | null }>(
    `SELECT response_text
     FROM ${TABLE_NAME}
     WHERE "delete" = 0
       AND lower(trim(request_text)) = lower(trim(?))
       AND response_text IS NOT NULL
     ORDER BY id DESC
     LIMIT 1;`,
    requestText,
  );
  return rows[0]?.response_text ?? null;
}

export type RequestVersion = {
  id: number;
  version: string | null;
  response_text: string | null;
  created_ts: string;
};

export async function getRequestVersions(requestText: string): Promise<RequestVersion[]> {
  const db = await getDb();
  return db.getAllAsync<RequestVersion>(
    `SELECT id, version, response_text, created_ts
     FROM ${TABLE_NAME}
     WHERE "delete" = 0 AND lower(trim(request_text)) = lower(trim(?))
     ORDER BY id DESC;`,
    requestText,
  );
}
