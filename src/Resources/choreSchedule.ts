import type { ChoreAction, ChoreSchedule, TrackerEntry } from "./types";
import { getLocalDateKey } from "./trackerStorage";

export type ChoreOccurrence = {
  entryId: string; name: string; key: string; dueDate: string;
  scheduleId?: string; completedDate?: string; reminderTime?: string;
  estimated?: boolean;
};

// Local noon and calendar arithmetic preserve dates across daylight-saving transitions.
export function choreDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function advanceChoreDate(key: string, every: number, unit: "days" | "weeks" | "months"): string {
  const date = choreDate(key);
  if (unit === "months") {
    const target = new Date(date.getFullYear(), date.getMonth() + every, 1, 12);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(date.getDate(), lastDay));
    return getLocalDateKey(target);
  }
  date.setDate(date.getDate() + every * (unit === "weeks" ? 7 : 1));
  return getLocalDateKey(date);
}

// Fixed monthly repeats always use the original day, so January 31 does not drift after February.
function fixedDate(schedule: ChoreSchedule, index: number): string {
  return index === 0 ? schedule.startDate
    : advanceChoreDate(schedule.startDate, schedule.repeat!.every * index, schedule.repeat!.unit);
}

function firstFixedIndex(schedule: ChoreSchedule, from: string): number {
  if (!schedule.repeat || from <= schedule.startDate) return 0;
  const start = choreDate(schedule.startDate), end = choreDate(from);
  const distance = schedule.repeat.unit === "months"
    ? (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth()
    : (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000;
  const step = schedule.repeat.every * (schedule.repeat.unit === "weeks" ? 7 : 1);
  return Math.max(0, Math.floor(distance / step) - 1);
}

// Calendar-only estimates preview completion-based repeats without creating actionable tasks or alarms.
export function listChoreOccurrences(entries: TrackerEntry[], from: string, to: string, options: { includeEstimates?: boolean; today?: string } = {}): ChoreOccurrence[] {
  const result: ChoreOccurrence[] = [];
  const today = options.today ?? getLocalDateKey(new Date());
  for (const entry of entries) {
    if (entry.type !== "chore" || !entry.choreTracking) continue;
    const tracking = entry.choreTracking;
    const completed = new Map(tracking.completions.map((item) => [item.key, item]));
    const occurrences = new Map<string, ChoreOccurrence>();
    for (const schedule of tracking.schedules) {
      if (schedule.stopped || !tracking.active) continue;
      let index = schedule.repeat?.basis === "fixed" ? firstFixedIndex(schedule, from) : 0;
      let due = fixedDate(schedule, index);
      let estimated = false;
      while (due <= to) {
        const key = `${schedule.id}:${due}`;
        const completion = completed.get(key);
        if (due >= from) occurrences.set(key, {
          entryId: entry.id, name: entry.name, key, dueDate: due, scheduleId: schedule.id,
          completedDate: completion?.completedDate, reminderTime: completion || estimated ? undefined : schedule.reminderTime,
          ...(estimated ? { estimated: true } : {}),
        });
        if (!schedule.repeat) break;
        let next: string;
        if (schedule.repeat.basis === "completion") {
          if (!completion && !options.includeEstimates) break;
          // An overdue task cannot be completed in the past; assume today until its actual completion.
          const basisDate = completion?.completedDate ?? (due < today ? today : due);
          estimated = estimated || !completion;
          next = advanceChoreDate(basisDate, schedule.repeat.every, schedule.repeat.unit);
        } else next = fixedDate(schedule, ++index);
        // Stop at the supported four-digit year boundary instead of wrapping string ordering.
        if (next <= due || !/^\d{4}-\d{2}-\d{2}$/.test(next)) break;
        due = next;
      }
    }
    // Retain manual and archived records even after list membership or schedules are removed.
    for (const completion of tracking.completions) {
      if (completion.dueDate >= from && completion.dueDate <= to) occurrences.set(completion.key, {
        ...completion, entryId: entry.id, name: entry.name,
      });
    }
    result.push(...occurrences.values());
  }
  return result.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.name.localeCompare(b.name) || a.key.localeCompare(b.key));
}

// Find a real pending date for the editor without exposing estimated or already completed plans.
export function chorePlanDate(entry: TrackerEntry, schedule: ChoreSchedule, today: string): string | undefined {
  if (!entry.choreTracking?.active || schedule.stopped) return undefined;
  const scoped = { ...entry, choreTracking: { ...entry.choreTracking, schedules: [schedule],
    completions: entry.choreTracking.completions.filter((item) => item.scheduleId === schedule.id) } };
  const horizon = schedule.repeat ? advanceChoreDate(today, schedule.repeat.every, schedule.repeat.unit) : today;
  const to = schedule.startDate > horizon ? schedule.startDate : horizon;
  const next = listChoreOccurrences([scoped], today, to).find((item) => !item.completedDate);
  return next?.dueDate ?? listChoreOccurrences([scoped], schedule.startDate, today).find((item) => !item.completedDate)?.dueDate;
}

// One pure update path gives checkboxes, planning dialogs, and persistence the same rules.
export function updateChore(entry: TrackerEntry, action: ChoreAction, today: string): TrackerEntry {
  if (entry.type !== "chore") throw new Error("This chore is no longer available.");
  const tracking = entry.choreTracking ?? { active: false, schedules: [], completions: [] };
  if (action.type === "add") return { ...entry, choreTracking: { ...tracking, active: true } };
  if (action.type === "remove") return { ...entry, choreTracking: {
    ...tracking, active: false, schedules: tracking.schedules.map((schedule) => ({ ...schedule, stopped: true })),
  } };
  if (action.type === "schedule" || action.type === "updateSchedule") {
    const plan = action.schedule;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(plan.startDate) || getLocalDateKey(choreDate(plan.startDate)) !== plan.startDate ||
        (plan.reminderTime !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(plan.reminderTime)) ||
        (plan.repeat && (!Number.isInteger(plan.repeat.every) || plan.repeat.every < 1 || plan.repeat.every > 365 ||
          !["days", "weeks", "months"].includes(plan.repeat.unit) || !["fixed", "completion"].includes(plan.repeat.basis)))) {
      throw new Error("Choose a valid date, frequency, and reminder time (HH:mm).");
    }
    // A reminder-only edit keeps the original anchor and completion links, including short-month clamps.
    const previous = action.type === "updateSchedule" ? tracking.schedules.find((item) => item.id === action.scheduleId && !item.stopped) : undefined;
    if (action.type === "updateSchedule") {
      if (!previous || !tracking.active) throw new Error("This plan is no longer available to update.");
      const pendingDate = chorePlanDate(entry, previous, today);
      if (!pendingDate) throw new Error("This plan has no pending dates. Add a new plan instead.");
      const sameRepeat = previous.repeat?.every === plan.repeat?.every && previous.repeat?.unit === plan.repeat?.unit && previous.repeat?.basis === plan.repeat?.basis;
      if (plan.startDate === pendingDate && sameRepeat) {
        const { reminderTime: _oldReminder, ...unchanged } = previous;
        return { ...entry, choreTracking: { ...tracking, schedules: tracking.schedules.map((item) => item.id === previous.id
          ? { ...unchanged, ...(plan.reminderTime ? { reminderTime: plan.reminderTime } : {}) } : item) } };
      }
      const completed = tracking.completions.filter((item) => item.scheduleId === previous.id);
      if (completed.some((item) => plan.startDate <= item.dueDate || plan.startDate <= item.completedDate)) {
        throw new Error("Choose a next date after this plan's saved completions.");
      }
    }
    // Ignore the replaced pending series when checking collisions, while retaining its completed history.
    const remaining = previous ? { ...entry, choreTracking: { ...tracking,
      schedules: tracking.schedules.map((item) => item.id === previous.id ? { ...item, stopped: true } : item) } } : entry;
    if (listChoreOccurrences([remaining], plan.startDate, plan.startDate).length > 0) {
      throw new Error("This chore already has a record or plan on that date.");
    }
    if (previous) {
      const hasHistory = tracking.completions.some((item) => item.scheduleId === previous.id);
      // Archive a completed series before replacing its pending dates; old completion IDs remain valid in backups.
      return { ...entry, choreTracking: { ...tracking, schedules: hasHistory
        ? [...tracking.schedules.map((item) => item.id === previous.id ? { ...item, stopped: true } : item),
          { ...plan, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` }]
        : tracking.schedules.map((item) => item.id === previous.id ? { ...plan, id: previous.id } : item) } };
    }
    return { ...entry, choreTracking: { ...tracking, active: true, schedules: [
      ...tracking.schedules, { ...plan, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` },
    ] } };
  }
  if (action.type !== "toggle") throw new Error("Unknown chore action.");
  const existing = tracking.completions.find((item) => item.key === action.key);
  if (existing) {
    const schedule = tracking.schedules.find((item) => item.id === existing.scheduleId);
    if (schedule?.repeat?.basis === "completion" && tracking.completions.some((item) =>
      item.scheduleId === schedule.id && item.dueDate > existing.dueDate)) {
      throw new Error("Undo the later completion first, because its date depends on this one.");
    }
    return { ...entry, choreTracking: { ...tracking, completions: tracking.completions.filter((item) => item.key !== action.key) } };
  }
  if (!tracking.active || action.dueDate > today) throw new Error("Only active chores due today or earlier can be completed.");
  const occurrence = listChoreOccurrences([entry], action.dueDate, action.dueDate).find((item) => item.key === action.key);
  if (!occurrence && (action.key !== `manual:${today}` || action.dueDate !== today)) throw new Error("This planned chore is no longer available.");
  return { ...entry, choreTracking: { ...tracking, completions: [...tracking.completions, {
    key: action.key, dueDate: action.dueDate, completedDate: today, ...(occurrence?.scheduleId ? { scheduleId: occurrence.scheduleId } : {}),
  }] } };
}

// Reminders use only pending dated occurrences and never include device-specific IDs in backups.
export function choreReminderEvents(entries: TrackerEntry[], from: string, to: string) {
  return listChoreOccurrences(entries, from, to).filter((item) => !item.completedDate && item.reminderTime).map((item) => {
    const date = choreDate(item.dueDate);
    const [hour, minute] = item.reminderTime!.split(":").map(Number);
    date.setHours(hour, minute, 0, 0);
    return { id: `chore:${entryKey(item.entryId)}:${item.key}`, name: item.name, date };
  });
}

function entryKey(id: string) { return encodeURIComponent(id); }
