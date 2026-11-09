import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TrackerDialog } from "./AddEntryModal";
import { Button } from "./Button";
import { DatePicker } from "./DatePicker";
import { Dropdown } from "./Dropdown";
import { requestChoreReminderPermission } from "../Resources/choreReminders";
import { choreDate, chorePlanDate } from "../Resources/choreSchedule";
import { getLocalDateKey } from "../Resources/trackerStorage";
import { COLORS } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";
import type { ChoreAction, TrackerEntry } from "../Resources/types";

type Props = {
  mode: "add" | "remove" | "schedule" | "update"; entries: TrackerEntry[]; date: Date; initialEntryId?: string;
  onClose: () => void; onSave: (id: string, action: ChoreAction) => Promise<void>;
};

// Planning and membership reuse the shared dialog, floating dropdown, date picker, and buttons.
export function ChorePlannerModal({ mode, entries, date, initialEntryId, onClose, onSave }: Props) {
  // Editing starts from the selected plan's pending date and saved settings rather than creating defaults.
  const editing = mode === "update";
  const todayKey = getLocalDateKey(new Date());
  const initialEntry = entries.find((entry) => entry.id === initialEntryId);
  const initialPlan = editing ? initialEntry?.choreTracking?.schedules.find((item) => chorePlanDate(initialEntry, item, todayKey)) : undefined;
  const [id, setId] = useState(initialEntryId);
  const [scheduleId, setScheduleId] = useState(initialPlan?.id);
  const [plannedDate, setPlannedDate] = useState(initialPlan ? choreDate(chorePlanDate(initialEntry!, initialPlan, todayKey)!) : date);
  const [repeat, setRepeat] = useState(initialPlan?.repeat?.basis ?? "none");
  const [unit, setUnit] = useState<"days" | "weeks" | "months">(initialPlan?.repeat?.unit ?? "months");
  const [every, setEvery] = useState(initialPlan?.repeat?.every ?? 1);
  const [remind, setRemind] = useState(!!initialPlan?.reminderTime);
  const [time, setTime] = useState(initialPlan?.reminderTime ?? "09:00");
  const [saving, setSaving] = useState(false);
  // Guard immediately, including while notification permission is awaiting a response.
  const pending = useRef(false);
  const [error, setError] = useState("");
  const close = () => { if (!pending.current) onClose(); };
  const schedule = mode === "schedule" || editing;
  const selectedEntry = entries.find((entry) => entry.id === id);
  const plans = editing ? selectedEntry?.choreTracking?.schedules.filter((item) => chorePlanDate(selectedEntry, item, todayKey)) ?? [] : [];
  const planChosen = !editing || plans.some((item) => item.id === scheduleId);
  // Changing either picker replaces all editable fields with that plan's own settings.
  const choosePlan = (entryId: string, planId?: string) => {
    const entry = entries.find((item) => item.id === entryId);
    const plan = entry?.choreTracking?.schedules.find((item) => (!planId || item.id === planId) && chorePlanDate(entry, item, todayKey));
    setId(entryId); setScheduleId(plan?.id); setError("");
    if (!plan || !entry) return;
    setPlannedDate(choreDate(chorePlanDate(entry, plan, todayKey)!));
    setRepeat(plan.repeat?.basis ?? "none"); setUnit(plan.repeat?.unit ?? "months"); setEvery(plan.repeat?.every ?? 1);
    setRemind(!!plan.reminderTime); setTime(plan.reminderTime ?? "09:00");
  };
  const title = editing ? "Update chore plan" : schedule ? "Add a chore for a date" : mode === "add" ? "Add a chore to the list" : "Remove a chore";
  const save = async () => {
    if (pending.current || !id || !entries.some((entry) => entry.id === id) || !planChosen) return;
    pending.current = true; setError(""); setSaving(true);
    try {
      if (schedule && remind) {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Enter a reminder time in 24-hour HH:mm format.");
        const reminderDate = new Date(plannedDate);
        const [hour, minute] = time.split(":").map(Number);
        reminderDate.setHours(hour, minute, 0, 0);
        if (reminderDate <= new Date()) throw new Error("Choose a future reminder date/time, or turn off the reminder.");
        // Ask only after an explicit reminder choice; planning still works without notification permission.
        if (!await requestChoreReminderPermission()) throw new Error("Allow notifications in your device/browser settings, or turn off the reminder to save the plan.");
      }
      const plan = {
        startDate: getLocalDateKey(plannedDate),
        // Existing custom intervals survive editing unless a different frequency is explicitly selected.
        ...(repeat !== "none" ? { repeat: { every, unit, basis: repeat === "fixed" ? "fixed" as const : "completion" as const } } : {}),
        ...(remind ? { reminderTime: time } : {}),
      };
      await onSave(id, editing ? { type: "updateSchedule", scheduleId: scheduleId!, schedule: plan }
        : mode === "schedule" ? { type: "schedule", schedule: plan } : { type: mode });
      onClose();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save this change. Please try again."); }
    finally { pending.current = false; setSaving(false); }
  };
  return (
    <TrackerDialog title={title} onClose={close} description={mode === "remove"
      ? "Remove it from your list and stop its future plans and reminders. Saved completions will be kept."
      : editing ? "Update pending dates, repeat settings, and reminders. Completed history is kept."
      : schedule ? "Choose a date, repeat frequency, and optional local reminder." : "Choose from your saved chores."}
      footer={<View style={styles.actions}>
        <Button disabled={saving} icon="close" label="Cancel" onPress={close} variant="secondary" />
        <Button disabled={saving || !entries.some((entry) => entry.id === id) || !planChosen} icon={mode === "remove" ? "removeHabit" : editing ? "save" : schedule ? "calendar" : "add"}
          label={saving ? "Saving…" : mode === "remove" ? "Remove chore" : editing ? "Update plan" : schedule ? "Save plan" : "Add to list"} onPress={() => { void save(); }} />
      </View>}
    >
      {entries.length ? <Dropdown disabled={saving} label="Chore" options={entries.map((entry) => ({ label: entry.name, value: entry.id }))} value={id}
        onChange={editing ? (value) => choosePlan(value) : setId} placeholder="Choose a chore" />
        : <Text style={styles.note}>{editing ? "No pending chore plans to update." : mode === "remove" ? "No chores in your list to remove." : mode === "add" ? "No saved chores available to add." : "Create a chore first using Options."}</Text>}
      {editing && selectedEntry ? <>
        {/* Stable plan IDs distinguish multiple schedules for the same saved chore. */}
        <Dropdown disabled={saving} label="Plan" placeholder="Choose a plan" value={scheduleId} onChange={(value) => choosePlan(id!, value)} options={plans.map((item) => ({ value: item.id,
          label: `${choreDate(chorePlanDate(selectedEntry, item, todayKey)!).toLocaleDateString("en-GB")} · ${item.repeat ? `${item.repeat.every === 1 ? { days: "Every day", weeks: "Every week", months: "Every month" }[item.repeat.unit] : `Every ${item.repeat.every} ${item.repeat.unit}`} · ${item.repeat.basis === "fixed" ? "Fixed" : "After completion"}` : "Once"}${item.reminderTime ? ` · ${item.reminderTime}` : ""}`,
        }))} />
        {!plans.length ? <Text style={styles.note}>This chore has no pending plans.</Text> : null}
      </> : null}
      {schedule && entries.length > 0 && planChosen ? <>
        <DatePicker inlineCalendar label={editing ? "Next date" : "First date"} value={plannedDate} onChange={setPlannedDate} />
        <Dropdown disabled={saving} label="Repeat" options={[
          { label: "Do not repeat", value: "none" }, { label: "On a fixed schedule", value: "fixed" }, { label: "After completing the chore", value: "completion" },
        ]} value={repeat} onChange={setRepeat} />
        {repeat !== "none" ? <>
          {/* Offer plain-language frequencies instead of separate interval and unit fields. */}
          <Dropdown disabled={saving} label="Frequency" options={[
            { label: "Every day", value: "days" }, { label: "Every week", value: "weeks" }, { label: "Every month", value: "months" },
            ...(every !== 1 ? [{ label: `Every ${every} ${unit}`, value: "existing" }] : []),
          ]} value={every === 1 ? unit : "existing"} onChange={(value) => { if (value !== "existing") { setUnit(value as typeof unit); setEvery(1); } }} />
          <Text style={styles.note}>{repeat === "fixed" ? "Fixed repeats keep their date pattern when completed late." : "The next date is calculated from the day you complete the chore."}</Text>
        </> : null}
        <View style={styles.reminder}>
          <Button checked={remind} disabled={saving} label="Remind me" onPress={() => setRemind((current) => !current)} />
          <Text style={styles.note}>Remind me</Text>
        </View>
        {remind ? <View style={styles.timeField}>
          {/* Shared selectors provide a valid 24-hour time without free-form typing. */}
          <Text style={styles.timeLabel}>Reminder time (24-hour)</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeColumn}><Dropdown disabled={saving} label="Hour" options={Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"))}
              value={time.slice(0, 2)} onChange={(hour) => setTime(`${hour}:${time.slice(3, 5)}`)} /></View>
            <View style={styles.timeColumn}><Dropdown disabled={saving} label="Minute" options={Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"))}
              value={time.slice(3, 5)} onChange={(minute) => setTime(`${time.slice(0, 2)}:${minute}`)} /></View>
          </View>
          <Text style={styles.note}>Uses this device’s local time. Browser reminders work while the app is open.</Text>
        </View> : null}
      </> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </TrackerDialog>
  );
}

const styles = StyleSheet.create({
  // Keep the planner consistent with existing modal spacing and shared typography.
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  reminder: { alignItems: "center", flexDirection: "row", gap: 8 },
  // Keep both time selectors aligned in the browser and on narrow phones.
  timeField: { gap: 8 }, timeRow: { flexDirection: "row", gap: 12 }, timeColumn: { flex: 1, minWidth: 0 },
  timeLabel: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 15 },
  note: { color: COLORS.mutedText, fontFamily: FONT_FAMILY.regular, fontSize: 14 },
  error: { color: COLORS.gradientPlum, fontFamily: FONT_FAMILY.medium, fontSize: 14 },
});
