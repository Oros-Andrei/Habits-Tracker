import * as Notifications from "expo-notifications";
import { advanceChoreDate, choreReminderEvents } from "./choreSchedule";
import { getLocalDateKey } from "./trackerStorage";
import type { TrackerEntry } from "./types";

const CHANNEL = "chore-reminders";
// Local scheduled notifications work without an account, network connection, or push service.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});
let pending: Promise<string | undefined> = Promise.resolve(undefined);

export async function requestChoreReminderPermission(): Promise<boolean> {
  await Notifications.setNotificationChannelAsync(CHANNEL, { name: "Chore reminders", importance: Notifications.AndroidImportance.DEFAULT });
  return (await Notifications.getPermissionsAsync()).granted || (await Notifications.requestPermissionsAsync()).granted;
}

// Serialize reconciliation so a quick done/undo cannot leave an obsolete native alarm behind.
export function syncChoreReminders(entries: TrackerEntry[], now = new Date()): Promise<string | undefined> {
  pending = pending.catch(() => undefined).then(async () => {
    try {
      const today = getLocalDateKey(now);
      const horizon = advanceChoreDate(today, 24, "months");
      const events = choreReminderEvents(entries, today, horizon);
      // Include a first reminder even when its planned date is beyond the rolling horizon.
      for (const entry of entries) for (const schedule of entry.choreTracking?.schedules ?? []) {
        if (schedule.startDate > horizon && !schedule.stopped) events.push(...choreReminderEvents([entry], schedule.startDate, schedule.startDate));
      }
      const desired = new Map(events.filter((event) => event.date > now).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 128).map((event) => [event.id, event]));
      const existing = await Notifications.getAllScheduledNotificationsAsync();
      for (const request of existing) {
        if (!request.identifier.startsWith("chore:")) continue;
        const event = desired.get(request.identifier);
        if (!event || request.content.data?.at !== event.date.getTime() || request.content.body !== event.name) {
          await Notifications.cancelScheduledNotificationAsync(request.identifier);
        } else desired.delete(request.identifier);
      }
      if (!desired.size) return undefined;
      if (!(await Notifications.getPermissionsAsync()).granted) return "Phone notifications are off. Your chores and schedules are still saved.";
      await Notifications.setNotificationChannelAsync(CHANNEL, { name: "Chore reminders", importance: Notifications.AndroidImportance.DEFAULT });
      for (const event of desired.values()) await Notifications.scheduleNotificationAsync({
        identifier: event.id,
        content: { title: "Chore reminder", body: event.name, data: { at: event.date.getTime() }, sound: "default" },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: event.date, channelId: CHANNEL },
      });
      return undefined;
    } catch {
      return "Phone reminders could not be updated. Reopen the app to retry; your schedules are saved.";
    }
  });
  return pending;
}
