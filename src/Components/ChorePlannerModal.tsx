import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TrackerDialog } from "./AddEntryModal";
import { Button } from "./Button";
import { DatePicker } from "./DatePicker";
import { Dropdown } from "./Dropdown";
import { requestChoreReminderPermission } from "../Resources/choreReminders";
import { getLocalDateKey } from "../Resources/trackerStorage";
import { COLORS } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";
import type { ChoreAction, TrackerEntry } from "../Resources/types";

type Props = {
  mode: "add" | "remove" | "schedule"; entries: TrackerEntry[]; date: Date; initialEntryId?: string;
  onClose: () => void; onSave: (id: string, action: ChoreAction) => Promise<void>;
};

// Planning and membership reuse the shared dialog, floating dropdown, date picker, and buttons.
export function ChorePlannerModal({ mode, entries, date, initialEntryId, onClose, onSave }: Props) {
  const [id, setId] = useState(initialEntryId);
  const [plannedDate, setPlannedDate] = useState(date);
  const [repeat, setRepeat] = useState("none");
  const [unit, setUnit] = useState<"days" | "weeks" | "months">("months");
  const [remind, setRemind] = useState(false);
  const [time, setTime] = useState("09:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const close = () => { if (!saving) onClose(); };
  const schedule = mode === "schedule";
  const title = schedule ? "Add a chore for a date" : mode === "add" ? "Add a chore to the list" : "Remove a chore";
  const save = async () => {
    if (saving || !id || !entries.some((entry) => entry.id === id)) return;
    setError(""); setSaving(true);
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
      await onSave(id, schedule ? { type: "schedule", schedule: {
        startDate: getLocalDateKey(plannedDate),
        // The frequency selector represents one day, week, or month directly.
        ...(repeat !== "none" ? { repeat: { every: 1, unit, basis: repeat === "fixed" ? "fixed" as const : "completion" as const } } : {}),
        ...(remind ? { reminderTime: time } : {}),
      } } : { type: mode });
      onClose();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save this change. Please try again."); }
    finally { setSaving(false); }
  };
  return (
    <TrackerDialog title={title} onClose={close} description={mode === "remove"
      ? "Remove it from your list and stop its future plans and reminders. Saved completions will be kept."
      : schedule ? "Choose a date, repeat frequency, and optional local reminder." : "Choose from your saved chores."}
      footer={<View style={styles.actions}>
        <Button disabled={saving} icon="close" label="Cancel" onPress={close} variant="secondary" />
        <Button disabled={saving || !entries.some((entry) => entry.id === id)} icon={mode === "remove" ? "removeHabit" : schedule ? "calendar" : "add"}
          label={saving ? "Saving…" : mode === "remove" ? "Remove chore" : schedule ? "Save plan" : "Add to list"} onPress={() => { void save(); }} />
      </View>}
    >
      {entries.length ? <Dropdown label="Chore" options={entries.map((entry) => ({ label: entry.name, value: entry.id }))} value={id} onChange={setId} placeholder="Choose a chore" />
        : <Text style={styles.note}>{mode === "remove" ? "No chores in your list to remove." : mode === "add" ? "No saved chores available to add." : "Create a chore first using Options."}</Text>}
      {schedule && entries.length > 0 ? <>
        <DatePicker inlineCalendar label="First date" value={plannedDate} onChange={setPlannedDate} />
        <Dropdown label="Repeat" options={[
          { label: "Do not repeat", value: "none" }, { label: "On a fixed schedule", value: "fixed" }, { label: "After completing the chore", value: "completion" },
        ]} value={repeat} onChange={setRepeat} />
        {repeat !== "none" ? <>
          {/* Offer plain-language frequencies instead of separate interval and unit fields. */}
          <Dropdown label="Frequency" options={[
            { label: "Every day", value: "days" }, { label: "Every week", value: "weeks" }, { label: "Every month", value: "months" },
          ]} value={unit} onChange={(value) => setUnit(value as typeof unit)} />
          <Text style={styles.note}>{repeat === "fixed" ? "Dates stay anchored to the first date, even if you finish late." : "The next date is calculated from the day you complete the chore."}</Text>
        </> : null}
        <View style={styles.reminder}>
          <Button checked={remind} label="Remind me" onPress={() => setRemind((current) => !current)} />
          <Text style={styles.note}>Remind me</Text>
        </View>
        {remind ? <View style={styles.timeField}>
          {/* Shared selectors provide a valid 24-hour time without free-form typing. */}
          <Text style={styles.timeLabel}>Reminder time (24-hour)</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeColumn}><Dropdown label="Hour" options={Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"))}
              value={time.slice(0, 2)} onChange={(hour) => setTime(`${hour}:${time.slice(3, 5)}`)} /></View>
            <View style={styles.timeColumn}><Dropdown label="Minute" options={Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"))}
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
