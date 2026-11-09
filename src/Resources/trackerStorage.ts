import { readStoredSnapshot, writeStoredSnapshot } from "./snapshotStore";
import type { ChoreTracking, ExpenseBook, ShoppingBook, TrackerEntry, TrackerEntryType, TrackerSnapshot } from "./types";
import { emptyExpenseBook, parseExpenseBook, parseMonthlyExpense } from "./expenseLedger";
import { emptyShoppingBook, mergeShoppingBook, parseShoppingBook } from "./shoppingLedger";

const ENTRY_TYPES: TrackerEntryType[] = ["goodHabit", "badHabit", "expenseType", "chore"];
// Validate each tracking field only on its own habit category.
const HABIT_TRACKING_FIELDS = [["goodHabitTracking", "goodHabit"], ["badHabitTracking", "badHabit"]] as const;

export type TrackerBackup = {
  app: "habits-tracker";
  // New data formats must be rejected by older apps rather than silently discarded.
  formatVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
  exportedAt: string;
  entries: TrackerEntry[];
  expenses?: ExpenseBook;
  // Shopping is optional only in older portable formats, never omitted by new exports.
  shopping?: ShoppingBook;
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
    // Preserve fixed amounts and funding sources independently of individual monthly payments.
    if (candidate.monthlyExpense !== undefined) {
      if (parsed.type !== "expenseType") throw new Error("Monthly settings belong only to expenses.");
      parsed.monthlyExpense = parseMonthlyExpense(candidate.monthlyExpense);
    }
    return parsed;
  });
}

// Existing saved names remain in the library until explicitly added to the daily list.
export async function loadTrackerEntries(): Promise<TrackerEntry[]> {
  return (await loadTrackerSnapshot()).entries;
}

// Share validation between legacy migration, SQLite reads, and browser snapshot loading.
function parseStoredSnapshot(value: unknown): TrackerSnapshot {
  if (Array.isArray(value)) {
    const entries = parseEntries(value);
    return { entries, expenses: parseExpenseBook(emptyExpenseBook(), entries), shopping: emptyShoppingBook() };
  }
  if (!value || typeof value !== "object") throw new Error("Invalid saved tracker snapshot.");
  const candidate = value as TrackerSnapshot;
  const entries = parseEntries(candidate.entries);
  // Migrate earlier snapshots without inventing products or losing their existing tracker data.
  return { entries, expenses: parseExpenseBook(candidate.expenses, entries), shopping: parseShoppingBook(candidate.shopping) };
}

// Metro selects local SQLite on Android while browsers retain their existing local storage.
export function loadTrackerSnapshot(): Promise<TrackerSnapshot> {
  return readStoredSnapshot(parseStoredSnapshot);
}

// Save names, daily-list membership, and completion history together in one snapshot.
export async function saveTrackerEntries(entries: TrackerEntry[]): Promise<void> {
  const current = await loadTrackerSnapshot();
  return saveTrackerSnapshot({ ...current, entries });
}

// Validate the whole change before the platform store commits its atomic write or transaction.
export function saveTrackerSnapshot(snapshot: TrackerSnapshot): Promise<void> {
  const entries = parseEntries(snapshot.entries);
  const expenses = parseExpenseBook(snapshot.expenses, entries);
  // Checklist purchases and their stock additions commit in the same write as all other trackers.
  const shopping = parseShoppingBook(snapshot.shopping);
  return writeStoredSnapshot({ entries, expenses, shopping }, parseStoredSnapshot);
}

// Version 13 preserves optional stock expiry; older apps must reject rather than discard it.
export function parseTrackerBackup(value: unknown): TrackerBackup {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The selected file is not a valid Habits Tracker backup.");
  }
  const backup = value as Partial<TrackerBackup>;
  if (backup.app !== "habits-tracker" || ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].includes(backup.formatVersion as number) ||
      typeof backup.exportedAt !== "string") {
    throw new Error("This is not a supported Habits Tracker backup.");
  }
  const entries = parseEntries(backup.entries);
  const expenses = backup.expenses === undefined && (backup.formatVersion as number) < 5 ? undefined : parseExpenseBook(backup.expenses, entries);
  // Current-format backups must contain every new array; legacy files may omit them.
  if ((backup.formatVersion as number) >= 7 && (!backup.expenses || ["extraIncomes", "savingsAdjustments", "loans", "loanRepayments"].some((key) =>
    !Array.isArray((backup.expenses as unknown as Record<string, unknown>)[key])))) throw new Error("The backup is missing financial history.");
  if ((backup.formatVersion as number) >= 8 && backup.shopping === undefined) throw new Error("The backup is missing shopping and inventory data.");
  // Current-format rows explicitly store null for an omitted amount; only older files need default migration.
  if ((backup.formatVersion as number) >= 11 && Array.isArray(backup.shopping?.items) && backup.shopping.items.some((item) => !item || item.quantity === undefined)) {
    throw new Error("The backup is missing shopping-list quantity data.");
  }
  // An explicit null distinguishes a cleared date from a backup created before expiry existed.
  if ((backup.formatVersion as number) >= 13 && Array.isArray(backup.shopping?.stock) && backup.shopping.stock.some((item) => !item || item.expiryDate === undefined)) {
    throw new Error("The backup is missing inventory expiry-date data.");
  }
  const shopping = (backup.formatVersion as number) >= 8 ? parseShoppingBook(backup.shopping) : undefined;
  return {
    app: "habits-tracker",
    formatVersion: backup.formatVersion as TrackerBackup["formatVersion"],
    exportedAt: backup.exportedAt,
    entries,
    ...(expenses ? { expenses } : {}),
    ...(shopping ? { shopping } : {}),
  };
}

// Older backups must not erase local tracking for either habit category.
export function mergeTrackerEntries(current: TrackerEntry[], incoming: TrackerEntry[]): TrackerEntry[] {
  const merged = new Map(current.map((entry) => [entry.id, entry]));
  for (const entry of incoming) {
    const existing = merged.get(entry.id);
    // Legacy imports must not detach an already assigned expense just because the field was absent.
    let incomingEntry = entry.type === "expenseType" && existing?.type === "expenseType" && entry.expenseCategoryId === undefined && existing.expenseCategoryId !== undefined
      ? { ...entry, expenseCategoryId: existing.expenseCategoryId } : entry;
    if (entry.type === "expenseType" && existing?.type === "expenseType" && entry.monthlyExpense === undefined && existing.monthlyExpense !== undefined) {
      incomingEntry = { ...incomingEntry, monthlyExpense: incomingEntry.expenseCategoryId === existing.expenseCategoryId ? existing.monthlyExpense : null };
    }
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
  // Old backups preserve newer quantities/dates; matching imported stock still replaces its quantity.
  const shopping = mergeShoppingBook(current.shopping, incoming.formatVersion >= 8 ? incoming.shopping : undefined, incoming.formatVersion < 11, incoming.formatVersion < 13);
  if (!incoming.expenses) return { entries, expenses: parseExpenseBook(current.expenses, entries), shopping };
  const merge = <T extends { id: string }>(local: T[], imported: T[]): T[] => [...new Map([...local, ...imported].map((item) => [item.id, item])).values()];
  const categories = merge(current.expenses.categories, incoming.expenses.categories);
  const inactive = new Set(categories.filter((item) => !item.active).map((item) => item.id));
  entries = entries.map((item) => item.expenseCategoryId && inactive.has(item.expenseCategoryId) ? { ...item, expenseCategoryId: null, monthlyExpense: null } : item);
  const incomes = [...new Map([...current.expenses.incomes, ...incoming.expenses.incomes].map((item) => [`${item.source}:${item.effectiveMonth}`, item])).values()];
  // A legacy matching payment must not lose its paid marker merely because old formats omitted it.
  const importedRecords = incoming.expenses.records.map((record) => {
    const existing = current.expenses.records.find((item) => item.id === record.id);
    return incoming.formatVersion < 6 && existing?.monthly && record.monthly === undefined && existing.expenseId === record.expenseId && existing.date.slice(0, 7) === record.date.slice(0, 7)
      ? { ...record, monthly: true as const } : record;
  });
  // Merge new history by stable ID; importing an older backup cannot erase these local balances.
  const expenses = parseExpenseBook({ categories, records: merge(current.expenses.records, importedRecords), incomes,
    extraIncomes: merge(current.expenses.extraIncomes ?? [], incoming.formatVersion >= 7 ? incoming.expenses.extraIncomes : []),
    savingsAdjustments: merge(current.expenses.savingsAdjustments ?? [], incoming.formatVersion >= 7 ? incoming.expenses.savingsAdjustments : []),
    loans: merge(current.expenses.loans ?? [], incoming.formatVersion >= 7 ? incoming.expenses.loans : []),
    loanRepayments: merge(current.expenses.loanRepayments ?? [], incoming.formatVersion >= 7 ? incoming.expenses.loanRepayments : []),
  }, entries);
  return { entries, expenses, shopping };
}
