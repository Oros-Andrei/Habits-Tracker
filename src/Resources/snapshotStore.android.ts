import AsyncStorage from "@react-native-async-storage/async-storage";
import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import { emptyExpenseBook } from "./expenseLedger";
import { emptyShoppingBook } from "./shoppingLedger";
import { snapshotToRows, rowsToSnapshot, type SnapshotRow } from "./snapshotRows";
import type { TrackerSnapshot } from "./types";

// Native SQLite lives in this app's private directory; no server or sync service is used.
const DATABASE_NAME = "personal-tracker.db";
const LEGACY_KEY = "habits-tracker:entries:v1";
type SnapshotParser = (value: unknown) => TrackerSnapshot;
let database: Promise<SQLiteDatabase> | undefined;
let pending: Promise<unknown> = Promise.resolve();

// Serialize initialization, imports, reads, and writes so only complete transactions become visible.
function enqueue<T>(action: () => Promise<T>): Promise<T> {
  const result = pending.then(action);
  pending = result.catch(() => undefined);
  return result;
}

async function getDatabase(): Promise<SQLiteDatabase> {
  if (!database) {
    database = (async () => {
      const db = await openDatabaseAsync(DATABASE_NAME);
      try {
        await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;");
        return db;
      } catch (error) {
        await db.closeAsync().catch(() => undefined);
        throw error;
      }
    })().catch((error) => { database = undefined; throw error; });
  }
  return database;
}

// Refuse future schemas rather than letting an older app overwrite unfamiliar data.
async function ensureSchema(txn: SQLiteDatabase): Promise<void> {
  const version = await txn.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  if (!version || (version.user_version !== 0 && version.user_version !== 1)) {
    throw new Error("This database needs a newer version of Habits Tracker.");
  }
  if (version.user_version === 0) {
    await txn.execAsync(`
      CREATE TABLE tracker_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
      CREATE TABLE tracker_records (
        collection TEXT NOT NULL,
        record_key TEXT NOT NULL,
        ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
        payload TEXT NOT NULL,
        PRIMARY KEY (collection, record_key)
      );
      PRAGMA user_version = 1;
    `);
  }
}

const readRows = (txn: SQLiteDatabase) => txn.getAllAsync<SnapshotRow>(
  "SELECT collection, record_key, ordinal, payload FROM tracker_records ORDER BY collection, ordinal, record_key",
);
const rowKey = (row: SnapshotRow) => JSON.stringify([row.collection, row.record_key]);

// Bind all user data and update only changed records; related changes commit or roll back together.
async function replaceRows(txn: SQLiteDatabase, rows: SnapshotRow[]): Promise<void> {
  const previous = new Map((await readRows(txn)).map((row) => [rowKey(row), row]));
  const statement = await txn.prepareAsync(`INSERT INTO tracker_records (collection, record_key, ordinal, payload)
    VALUES (?, ?, ?, ?) ON CONFLICT (collection, record_key)
    DO UPDATE SET ordinal = excluded.ordinal, payload = excluded.payload`);
  try {
    for (const row of rows) {
      const key = rowKey(row), old = previous.get(key);
      if (!old || old.ordinal !== row.ordinal || old.payload !== row.payload) {
        await statement.executeAsync([row.collection, row.record_key, row.ordinal, row.payload]);
      }
      previous.delete(key);
    }
    for (const row of previous.values()) {
      await txn.runAsync("DELETE FROM tracker_records WHERE collection = ? AND record_key = ?", [row.collection, row.record_key]);
    }
  } finally {
    await statement.finalizeAsync();
  }
}

// Verify a first-run migration before marking it complete, retaining the original recovery copy.
async function initialize(txn: SQLiteDatabase, parse: SnapshotParser): Promise<void> {
  await ensureSchema(txn);
  const initialized = await txn.getFirstAsync<{ value: string }>("SELECT value FROM tracker_meta WHERE key = ?", ["initialized"]);
  if (initialized) {
    if (initialized.value !== "1") throw new Error("Invalid local database initialization state.");
    return;
  }
  if ((await readRows(txn)).length) throw new Error("Incomplete local database. Existing records have been preserved.");
  const legacy = await AsyncStorage.getItem(LEGACY_KEY);
  const snapshot = parse(legacy === null ? { entries: [], expenses: emptyExpenseBook(), shopping: emptyShoppingBook() } : JSON.parse(legacy));
  const rows = snapshotToRows(snapshot);
  await replaceRows(txn, rows);
  const restored = parse(rowsToSnapshot(await readRows(txn)));
  if (JSON.stringify(restored) !== JSON.stringify(snapshot)) throw new Error("Local data migration could not be verified. Original data has been preserved.");
  await txn.runAsync("INSERT INTO tracker_meta (key, value) VALUES (?, ?)", ["initialized", "1"]);
}

// Once initialized, SQLite is authoritative: never silently fall back to stale legacy records.
export function readStoredSnapshot(parse: SnapshotParser): Promise<TrackerSnapshot> {
  return enqueue(async () => {
    const db = await getDatabase();
    let snapshot: TrackerSnapshot | undefined;
    await db.withExclusiveTransactionAsync(async (txn) => {
      await initialize(txn, parse);
      snapshot = parse(rowsToSnapshot(await readRows(txn)));
    });
    if (!snapshot) throw new Error("Local database could not be loaded.");
    return snapshot;
  });
}

// The shared validation and write guard remain in place around the Android transaction.
export function writeStoredSnapshot(snapshot: TrackerSnapshot, parse: SnapshotParser): Promise<void> {
  return enqueue(async () => {
    const db = await getDatabase();
    const rows = snapshotToRows(snapshot);
    await db.withExclusiveTransactionAsync(async (txn) => {
      await initialize(txn, parse);
      await replaceRows(txn, rows);
    });
  });
}
