import AsyncStorage from "@react-native-async-storage/async-storage";
import type { TrackerEntry, TrackerEntryType } from "./types";

const STORAGE_KEY = "habits-tracker:entries:v1";
const ENTRY_TYPES: TrackerEntryType[] = ["goodHabit", "badHabit", "expenseType", "chore"];

export type TrackerBackup = {
  app: "habits-tracker";
  formatVersion: 1;
  exportedAt: string;
  entries: TrackerEntry[];
};

// Persist tracker names locally so they remain available after restarting the app.
export async function loadTrackerEntries(): Promise<TrackerEntry[]> {
  const serialized = await AsyncStorage.getItem(STORAGE_KEY);
  if (!serialized) return [];

  const parsed: unknown = JSON.parse(serialized);
  if (!Array.isArray(parsed)) return [];

  return parsed.filter((entry): entry is TrackerEntry =>
    typeof entry?.id === "string" &&
    typeof entry?.name === "string" &&
    ["goodHabit", "badHabit", "expenseType", "chore"].includes(entry?.type as TrackerEntryType),
  );
}

// Replace the local snapshot atomically whenever a new tracker name is added.
export function saveTrackerEntries(entries: TrackerEntry[]): Promise<void> {
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// Validate the complete backup before accepting any records into local storage.
export function parseTrackerBackup(value: unknown): TrackerBackup {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The selected file is not a valid Habits Tracker backup.");
  }

  const backup = value as Partial<TrackerBackup>;
  if (backup.app !== "habits-tracker" || backup.formatVersion !== 1 ||
      typeof backup.exportedAt !== "string" || !Array.isArray(backup.entries)) {
    throw new Error("This is not a supported Habits Tracker backup.");
  }

  const entries = backup.entries.map((entry) => {
    if (!entry || typeof entry !== "object" ||
        typeof entry.id !== "string" || !entry.id.trim() ||
        typeof entry.name !== "string" || !entry.name.trim() ||
        !ENTRY_TYPES.includes(entry.type as TrackerEntryType)) {
      throw new Error("The backup contains an invalid tracker entry. No data was imported.");
    }
    return { id: entry.id, name: entry.name, type: entry.type as TrackerEntryType };
  });

  return { app: "habits-tracker", formatVersion: 1, exportedAt: backup.exportedAt, entries };
}

// Merge backups by ID so imports keep local-only entries and refresh matching records.
export function mergeTrackerEntries(current: TrackerEntry[], incoming: TrackerEntry[]): TrackerEntry[] {
  return Array.from(new Map([...current, ...incoming].map((entry) => [entry.id, entry])).values());
}
