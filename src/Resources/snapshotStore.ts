import AsyncStorage from "@react-native-async-storage/async-storage";
import type { TrackerSnapshot } from "./types";

// Keep browser storage independent of the Android-only SQLite module.
const STORAGE_KEY = "habits-tracker:entries:v1";
export type SnapshotParser = (value: unknown) => TrackerSnapshot;

export async function readStoredSnapshot(parse: SnapshotParser): Promise<TrackerSnapshot> {
  const serialized = await AsyncStorage.getItem(STORAGE_KEY);
  return parse(serialized === null ? [] : JSON.parse(serialized));
}

// Preserve the browser's existing atomic snapshot and portable backup behavior.
export async function writeStoredSnapshot(snapshot: TrackerSnapshot, _parse: SnapshotParser): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}
