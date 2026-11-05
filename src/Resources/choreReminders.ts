import { choreReminderEvents } from "./choreSchedule";
import { getLocalDateKey } from "./trackerStorage";
import type { TrackerEntry } from "./types";

// Browser reminders run only while the app is open; no push subscription or server is created.
export async function requestChoreReminderPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  return Notification.permission === "granted" || await Notification.requestPermission() === "granted";
}

export async function syncChoreReminders(entries: TrackerEntry[], now = new Date()): Promise<string | undefined> {
  const today = getLocalDateKey(now);
  const events = choreReminderEvents(entries, today, today);
  if (!events.length) return undefined;
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
    return "Browser notifications are off. Your planned and overdue chores are still shown here.";
  }
  // A device-local daily marker avoids replaying the same reminder after reload or undo.
  try {
    const markerKey = "habits-tracker:chore-reminders:v1";
    const stored: unknown = JSON.parse(window.localStorage.getItem(markerKey) ?? "null");
    const record = stored && typeof stored === "object" ? stored as { day?: string; delivered?: unknown } : {};
    const delivered = new Set(record.day === today && Array.isArray(record.delivered)
      ? record.delivered.filter((id): id is string => typeof id === "string") : []);
    for (const event of events) {
      const id = `${event.id}:${event.date.getTime()}`;
      if (event.date > now || delivered.has(id)) continue;
      const notification = new Notification("Chore reminder", { body: event.name, tag: id });
      notification.onclick = () => { window.focus(); notification.close(); };
      delivered.add(id);
      window.localStorage.setItem(markerKey, JSON.stringify({ day: today, delivered: [...delivered] }));
    }
    return undefined;
  } catch {
    return "Browser reminders could not be displayed. Your chores and schedules are saved.";
  }
}
