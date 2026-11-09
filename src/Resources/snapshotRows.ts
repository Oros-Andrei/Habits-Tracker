import { emptyExpenseBook } from "./expenseLedger";
import { emptyShoppingBook } from "./shoppingLedger";
import type { ChoreCompletion, ChoreSchedule, ExpenseBook, ShoppingBook, TrackerEntry, TrackerSnapshot } from "./types";

// Keep long-lived histories in individual rows instead of one growing Android JSON value.
export type SnapshotRow = { collection: string; record_key: string; ordinal: number; payload: string };
const expenseCollections = ["categories", "records", "incomes", "extraIncomes", "savingsAdjustments", "loans", "loanRepayments"] as const;
const shoppingCollections = ["products", "supermarkets", "offers", "items", "locations", "stock"] as const;
const habitFields = ["goodHabitTracking", "badHabitTracking"] as const;

export function snapshotToRows(snapshot: TrackerSnapshot): SnapshotRow[] {
  const rows: SnapshotRow[] = [];
  const add = (collection: string, key: string, ordinal: number, value: unknown) => {
    rows.push({ collection, record_key: key, ordinal, payload: JSON.stringify(value) });
  };
  snapshot.entries.forEach((entry, index) => {
    const base = { ...entry };
    for (const field of habitFields) {
      const tracking = entry[field];
      if (!tracking) continue;
      base[field] = { active: tracking.active, completedDates: [] };
      tracking.completedDates.forEach((date, ordinal) => add("habitDays", JSON.stringify([entry.id, field, date]), ordinal, { entryId: entry.id, field, date }));
    }
    if (entry.choreTracking) {
      const tracking = entry.choreTracking;
      base.choreTracking = { active: tracking.active, schedules: [], completions: [] };
      tracking.schedules.forEach((schedule, ordinal) => add("choreSchedules", JSON.stringify([entry.id, schedule.id]), ordinal, { entryId: entry.id, schedule }));
      tracking.completions.forEach((completion, ordinal) => add("choreCompletions", JSON.stringify([entry.id, completion.key]), ordinal, { entryId: entry.id, completion }));
    }
    add("entries", entry.id, index, base);
  });
  for (const field of expenseCollections) snapshot.expenses[field].forEach((item, index) => add(`expenses.${field}`, item.id, index, item));
  for (const field of shoppingCollections) snapshot.shopping[field].forEach((item, index) => add(`shopping.${field}`, item.id, index, item));
  return rows;
}

// Reject orphaned histories or unknown collections rather than dropping data on the next save.
export function rowsToSnapshot(rows: SnapshotRow[]): TrackerSnapshot {
  const snapshot: TrackerSnapshot = { entries: [], expenses: emptyExpenseBook(), shopping: emptyShoppingBook() };
  const fail = (): never => { throw new Error("The local database contains invalid records. Saved data has not been changed."); };
  const seen = new Set<string>();
  const decoded = rows.map((row) => {
    const key = JSON.stringify([row.collection, row.record_key]);
    if (seen.has(key) || !Number.isSafeInteger(row.ordinal) || row.ordinal < 0) return fail();
    seen.add(key);
    return { ...row, value: JSON.parse(row.payload) as Record<string, unknown> };
  }).sort((a, b) => a.ordinal - b.ordinal);
  const entries = new Map<string, TrackerEntry>();
  for (const row of decoded.filter((item) => item.collection === "entries")) {
    const entry = row.value as TrackerEntry;
    if (!entry || entry.id !== row.record_key || entries.has(entry.id)) return fail();
    // Arrays are stored only in child records, making reconstruction unambiguous.
    if (habitFields.some((field) => entry[field] && (!Array.isArray(entry[field]?.completedDates) || entry[field]!.completedDates.length)) ||
        (entry.choreTracking && (!Array.isArray(entry.choreTracking.schedules) || entry.choreTracking.schedules.length ||
          !Array.isArray(entry.choreTracking.completions) || entry.choreTracking.completions.length))) return fail();
    entries.set(entry.id, entry);
    snapshot.entries.push(entry);
  }
  for (const row of decoded) {
    const { collection, value } = row;
    if (!value || typeof value !== "object" || Array.isArray(value)) return fail();
    if (collection === "entries") continue;
    if (collection === "habitDays" || collection === "choreSchedules" || collection === "choreCompletions") {
      const entry = entries.get(value.entryId as string);
      if (!entry) return fail();
      if (collection === "habitDays") {
        if (!habitFields.includes(value.field as typeof habitFields[number]) || typeof value.date !== "string" ||
            row.record_key !== JSON.stringify([entry.id, value.field, value.date])) return fail();
        const tracking = entry[value.field as typeof habitFields[number]];
        if (!tracking) return fail();
        tracking.completedDates.push(value.date);
      } else if (collection === "choreSchedules") {
        const schedule = value.schedule as ChoreSchedule;
        if (!entry.choreTracking || !schedule || row.record_key !== JSON.stringify([entry.id, schedule.id])) return fail();
        entry.choreTracking.schedules.push(schedule);
      } else {
        const completion = value.completion as ChoreCompletion;
        if (!entry.choreTracking || !completion || row.record_key !== JSON.stringify([entry.id, completion.key])) return fail();
        entry.choreTracking.completions.push(completion);
      }
    } else {
      if (value.id !== row.record_key) return fail();
      const [book, field, extra] = collection.split(".");
      if (extra !== undefined) return fail();
      if (book === "expenses" && expenseCollections.includes(field as keyof ExpenseBook)) {
        (snapshot.expenses[field as keyof ExpenseBook] as unknown[]).push(value);
      } else if (book === "shopping" && shoppingCollections.includes(field as keyof ShoppingBook)) {
        (snapshot.shopping[field as keyof ShoppingBook] as unknown[]).push(value);
      } else return fail();
    }
  }
  return snapshot;
}
