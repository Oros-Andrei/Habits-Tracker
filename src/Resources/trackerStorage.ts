import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ChoreTracking, ExpenseBook, TrackerEntry, TrackerEntryType, TrackerSnapshot } from "./types";
import { emptyExpenseBook, parseExpenseBook } from "./expenseLedger";

const STORAGE_KEY = "habits-tracker:entries:v1";
const ENTRY_TYPES: TrackerEntryType[] = ["goodHabit", "badHabit", "expenseType", "chore"];
// Validate each tracking field only on its own habit category.
const HABIT_TRACKING_FIELDS = [["goodHabitTracking", "goodHabit"], ["badHabitTracking", "badHabit"]] as const;

export type TrackerBackup = {
  app: "habits-tracker";
  formatVersion: 1 | 2 | 3 | 4 | 5;
  exportedAt: string;
  entries: TrackerEntry[];
  expenses?: ExpenseBook;
};

// Use local calendar dates so checking a habit near midnight records the right day.
export function getLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Reject malformed plans and completion links before imports can alter the local planner.
function parseChoreTracking(value: unknown): ChoreTracking {
  const validDate = (date: unknown): date is string => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    getLocalDateKey(new Date(`${date}T12:00:00`)) === date;
  const fail = (): never => { throw new Error("The data contains invalid chore schedules or history."); };
  if (!value || typeof value !== "object") return fail();
  const tracking = value as ChoreTracking;
  if (typeof tracking.active !== "boolean" || !Array.isArray(tracking.schedules) || !Array.isArray(tracking.completions)) return fail();
  const ids = new Set<string>();
  const schedules = tracking.schedules.map((schedule) => {
    if (!schedule || typeof schedule !== "object" || typeof schedule.id !== "string" || !schedule.id.trim() || ids.has(schedule.id) ||
        !validDate(schedule.startDate) || (schedule.stopped !== undefined && typeof schedule.stopped !== "boolean") ||
        (schedule.reminderTime !== undefined && (typeof schedule.reminderTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.reminderTime)))) return fail();
    ids.add(schedule.id);
    const repeat = schedule.repeat;
    if (repeat !== undefined && (!repeat || typeof repeat !== "object" || !Number.isInteger(repeat.every) || repeat.every < 1 || repeat.every > 365 ||
        !["days", "weeks", "months"].includes(repeat.unit) || !["fixed", "completion"].includes(repeat.basis))) return fail();
    return { id: schedule.id, startDate: schedule.startDate,
      ...(repeat ? { repeat: { every: repeat.every, unit: repeat.unit, basis: repeat.basis } } : {}),
      ...(schedule.reminderTime !== undefined ? { reminderTime: schedule.reminderTime } : {}),
      ...(schedule.stopped !== undefined ? { stopped: schedule.stopped } : {}),
    };
  });
  const keys = new Set<string>();
  const completions = tracking.completions.map((item) => {
    if (!item || typeof item !== "object" || typeof item.key !== "string" || keys.has(item.key) ||
        !validDate(item.dueDate) || !validDate(item.completedDate) || item.completedDate < item.dueDate ||
        (item.scheduleId !== undefined && (typeof item.scheduleId !== "string" || !ids.has(item.scheduleId))) ||
        item.key !== (item.scheduleId === undefined ? `manual:${item.dueDate}` : `${item.scheduleId}:${item.dueDate}`)) return fail();
    keys.add(item.key);
    return { key: item.key, dueDate: item.dueDate, completedDate: item.completedDate,
      ...(item.scheduleId !== undefined ? { scheduleId: item.scheduleId } : {}),
    };
  });
  return { active: tracking.active, schedules, completions };
}

// Reject invalid history before loading or importing a snapshot that could replace saved data.
function parseEntries(value: unknown): TrackerEntry[] {
  if (!Array.isArray(value)) throw new Error("Tracker entries must be a list.");
  const ids = new Set<string>();
  return value.map((entry: unknown) => {
    if (!entry || typeof entry !== "object") throw new Error("Invalid tracker entry.");
    const candidate = entry as Partial<TrackerEntry>;
    if (typeof candidate.id !== "string" || !candidate.id.trim() || ids.has(candidate.id) ||
        typeof candidate.name !== "string" || !candidate.name.trim() ||
        !ENTRY_TYPES.includes(candidate.type as TrackerEntryType)) {
      throw new Error("The data contains an invalid or duplicate tracker entry.");
    }
    ids.add(candidate.id);
    const parsed: TrackerEntry = {
      id: candidate.id,
      name: candidate.name,
      type: candidate.type as TrackerEntryType,
    };
    for (const [field, type] of HABIT_TRACKING_FIELDS) {
      const tracking = candidate[field];
      if (tracking === undefined) continue;
      if (parsed.type !== type || !tracking || typeof tracking !== "object" ||
          typeof tracking.active !== "boolean" || !Array.isArray(tracking.completedDates) ||
          !tracking.completedDates.every((date: unknown) =>
            typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
            getLocalDateKey(new Date(`${date}T12:00:00`)) === date)) {
        throw new Error("The data contains invalid habit history.");
      }
      parsed[field] = {
        active: tracking.active,
        completedDates: Array.from(new Set(tracking.completedDates)),
      };
    }
    // Legacy name-only chores remain valid and join the list only when explicitly selected.
    if (candidate.choreTracking !== undefined) {
      if (parsed.type !== "chore") throw new Error("Chore history belongs only to chores.");
      parsed.choreTracking = parseChoreTracking(candidate.choreTracking);
    }
    // Explicit null assignments survive backup merges; old name-only entries remain unassigned.
    if (candidate.expenseCategoryId !== undefined) {
      if (parsed.type !== "expenseType" || (candidate.expenseCategoryId !== null && (typeof candidate.expenseCategoryId !== "string" || !candidate.expenseCategoryId.trim()))) {
        throw new Error("Invalid expense category assignment.");
      }
      parsed.expenseCategoryId = candidate.expenseCategoryId;
    }
    return parsed;
  });
}

// Existing saved names remain in the library until explicitly added to the daily list.
export async function loadTrackerEntries(): Promise<TrackerEntry[]> {
  return (await loadTrackerSnapshot()).entries;
}

// Read the original entries array or the new atomic snapshot without discarding any existing data.
export async function loadTrackerSnapshot(): Promise<TrackerSnapshot> {
  const serialized = await AsyncStorage.getItem(STORAGE_KEY);
  if (!serialized) return { entries: [], expenses: emptyExpenseBook() };
  const value: unknown = JSON.parse(serialized);
  if (Array.isArray(value)) {
    const entries = parseEntries(value);
    return { entries, expenses: parseExpenseBook(emptyExpenseBook(), entries) };
  }
  if (!value || typeof value !== "object") throw new Error("Invalid saved tracker snapshot.");
  const candidate = value as TrackerSnapshot;
  const entries = parseEntries(candidate.entries);
  return { entries, expenses: parseExpenseBook(candidate.expenses, entries) };
}

// Save names, daily-list membership, and completion history together in one snapshot.
export async function saveTrackerEntries(entries: TrackerEntry[]): Promise<void> {
  const current = await loadTrackerSnapshot();
  return saveTrackerSnapshot({ entries, expenses: current.expenses });
}

// Categories, payments, incomes, names, and tracker history commit together in one storage write.
export function saveTrackerSnapshot(snapshot: TrackerSnapshot): Promise<void> {
  const entries = parseEntries(snapshot.entries);
  const expenses = parseExpenseBook(snapshot.expenses, entries);
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, expenses }));
}

// Version 5 adds the expense ledger while keeping all previous backup formats readable.
export function parseTrackerBackup(value: unknown): TrackerBackup {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The selected file is not a valid Habits Tracker backup.");
  }
  const backup = value as Partial<TrackerBackup>;
  if (backup.app !== "habits-tracker" || ![1, 2, 3, 4, 5].includes(backup.formatVersion as number) ||
      typeof backup.exportedAt !== "string") {
    throw new Error("This is not a supported Habits Tracker backup.");
  }
  const entries = parseEntries(backup.entries);
  const expenses = backup.expenses === undefined && backup.formatVersion !== 5 ? undefined : parseExpenseBook(backup.expenses, entries);
  return {
    app: "habits-tracker",
    formatVersion: backup.formatVersion as TrackerBackup["formatVersion"],
    exportedAt: backup.exportedAt,
    entries,
    ...(expenses ? { expenses } : {}),
  };
}

// Older backups must not erase local tracking for either habit category.
export function mergeTrackerEntries(current: TrackerEntry[], incoming: TrackerEntry[]): TrackerEntry[] {
  const merged = new Map(current.map((entry) => [entry.id, entry]));
  for (const entry of incoming) {
    const existing = merged.get(entry.id);
    // Legacy imports must not detach an already assigned expense just because the field was absent.
    const incomingEntry = entry.type === "expenseType" && existing?.type === "expenseType" && entry.expenseCategoryId === undefined && existing.expenseCategoryId !== undefined
      ? { ...entry, expenseCategoryId: existing.expenseCategoryId } : entry;
    // Older name-only backups preserve local chore plans as well as habit tracking.
    const field = entry.type === "goodHabit" ? "goodHabitTracking" : entry.type === "badHabit" ? "badHabitTracking" : entry.type === "chore" ? "choreTracking" : undefined;
    if (field && existing?.type === entry.type && existing[field] && entry[field] === undefined) {
      merged.set(entry.id, {
        ...entry,
        [field]: existing[field],
      });
    } else {
      merged.set(entry.id, incomingEntry);
    }
  }
  return Array.from(merged.values());
}

// Merge portable financial entities by ID, with imported income settings winning for the same month.
export function mergeTrackerSnapshot(current: TrackerSnapshot, incoming: TrackerBackup): TrackerSnapshot {
  let entries = mergeTrackerEntries(current.entries, incoming.entries);
  if (!incoming.expenses) return { entries, expenses: parseExpenseBook(current.expenses, entries) };
  const merge = <T extends { id: string }>(local: T[], imported: T[]): T[] => [...new Map([...local, ...imported].map((item) => [item.id, item])).values()];
  const categories = merge(current.expenses.categories, incoming.expenses.categories);
  const inactive = new Set(categories.filter((item) => !item.active).map((item) => item.id));
  entries = entries.map((item) => item.expenseCategoryId && inactive.has(item.expenseCategoryId) ? { ...item, expenseCategoryId: null } : item);
  const incomes = [...new Map([...current.expenses.incomes, ...incoming.expenses.incomes].map((item) => [`${item.source}:${item.effectiveMonth}`, item])).values()];
  const expenses = parseExpenseBook({ categories, records: merge(current.expenses.records, incoming.expenses.records), incomes }, entries);
  return { entries, expenses };
}
