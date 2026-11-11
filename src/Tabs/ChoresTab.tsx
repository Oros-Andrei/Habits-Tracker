import { useEffect, useRef, useState, type ComponentRef } from "react";
import { AppState, Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { ActionMenu } from "../Components/ActionMenu";
import { Button } from "../Components/Button";
import { Calendar } from "../Components/Calendar";
import { ChorePlannerModal } from "../Components/ChorePlannerModal";
import { DeleteSavedItemModal } from "../Components/AddEntryModal";
import { choreDate, chorePlanDate, listChoreOccurrences, type ChoreOccurrence } from "../Resources/choreSchedule";
import { getLocalDateKey } from "../Resources/trackerStorage";
import { COLORS, SOFT_SHADOW } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";
import type { ChoreAction, TrackerEntry } from "../Resources/types";

type Props = {
  entries: TrackerEntry[]; onCreate: () => void; onUpdate: (id: string, action: ChoreAction) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  reminderNotice?: string;
};

// Match the requested three-column desktop layout and stack list, today, then calendar on Android.
export function ChoresTab({ entries, onCreate, onUpdate, onDelete, reminderNotice }: Props) {
  const { width, height } = useWindowDimensions();
  const columns = Platform.OS === "web" && width >= 1200;
  const [today, setToday] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [menu, setMenu] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const anchor = useRef<ComponentRef<typeof View>>(null);
  const [dialog, setDialog] = useState<{ mode: "add" | "remove" | "schedule" | "update"; entryId?: string; date: Date }>();
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState("");
  const todayKey = getLocalDateKey(today), selectedKey = getLocalDateKey(selectedDate);
  const active = entries.filter((entry) => !entry.archived && entry.choreTracking?.active);
  // Only today's confirmed work belongs in the checklist; future plans stay in the calendar.
  const todayItems = listChoreOccurrences(entries, todayKey, todayKey);
  const preview = { includeEstimates: true, today: todayKey };
  const selectedItems = listChoreOccurrences(entries, selectedKey, selectedKey, preview);
  const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1, 12);
  first.setDate(1 - (first.getDay() + 6) % 7);
  const last = new Date(first); last.setDate(last.getDate() + 41);
  const counts: Record<string, number> = {};
  const calendarItems = listChoreOccurrences(entries, getLocalDateKey(first), getLocalDateKey(last), preview);
  for (const item of calendarItems) counts[item.dueDate] = (counts[item.dueDate] ?? 0) + 1;

  // Re-evaluate due dates at midnight and after resuming without carrying yesterday's checkmarks.
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(() => setToday(new Date()), tomorrow.getTime() - now.getTime() + 100);
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") setToday(new Date()); });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [todayKey]);

  const update = async (id: string, action: ChoreAction) => {
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true); setError("");
    try { await onUpdate(id, action); setToday(new Date()); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save this change. Please try again."); }
    finally { savingRef.current = false; setSaving(false); }
  };
  const plan = (entryId?: string, date = selectedDate) => { setMenu(false); setDialog({ mode: "schedule", entryId, date }); };
  const openOptions = () => anchor.current?.measureInWindow((x, y, _width, buttonHeight) => {
    setPosition({ left: x, top: y + buttonHeight + 8 }); setMenu(true);
  });
  const format = (key: string) => choreDate(key).toLocaleDateString("en-GB");
  // The same dated occurrence is checked from Today and from the selected calendar date.
  const occurrenceRow = (item: ChoreOccurrence) => (
    <View key={`${item.entryId}:${item.key}`} style={[styles.row, item.completedDate && styles.done]}>
      {/* Estimated dates describe future possibilities and cannot be checked off. */}
      {!item.estimated ? <Button checked={!!item.completedDate} disabled={saving || item.dueDate > todayKey}
        label={`${item.name}, due ${format(item.dueDate)}`} onPress={() => { void update(item.entryId, { type: "toggle", key: item.key, dueDate: item.dueDate }); }} /> : null}
      <View style={styles.details}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.note}>{item.completedDate ? `Done · ${format(item.completedDate)}` : `${item.estimated ? "Estimated" : item.dueDate < todayKey ? "Overdue" : "Due"} · ${format(item.dueDate)}${item.reminderTime ? ` · ${item.reminderTime}` : ""}`}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.page}>
      <Modal animationType="none" transparent visible={menu} onRequestClose={() => setMenu(false)}>
        <View style={styles.menuOverlay}>
          <Pressable accessibilityLabel="Close chore options" accessibilityRole="button" onPress={() => setMenu(false)} style={StyleSheet.absoluteFill} />
          <ActionMenu visible={menu} menuStyle={{ left: Math.max(12, Math.min(position.left, width - Math.min(320, width - 24) - 12)), top: Math.max(12, Math.min(position.top, height - 385)), minWidth: 0, width: Math.min(320, width - 24) }} actions={[
            { id: "create", label: "Add a new chore", icon: "chores", onPress: () => { setMenu(false); onCreate(); } },
            { id: "add", label: "Add a chore to the list", icon: "add", onPress: () => { setMenu(false); setDialog({ mode: "add", date: selectedDate }); } },
            { id: "remove", label: "Remove a chore", icon: "removeHabit", onPress: () => { setMenu(false); setDialog({ mode: "remove", date: selectedDate }); } },
            { id: "schedule", label: "Add a chore for a date", icon: "calendar", onPress: () => plan() },
            // Reuse the planner with explicit saved-plan selection for editing pending work.
            { id: "update", label: "Update chore plan", icon: "options", onPress: () => { setMenu(false); setDialog({ mode: "update", date: selectedDate }); } },
            { id: "delete", label: "Delete a saved chore", icon: "removeHabit", onPress: () => { setMenu(false); setDeleteVisible(true); } },
          ]} />
        </View>
      </Modal>
      {deleteVisible ? <DeleteSavedItemModal groups={[{ kind: "chore", label: "Chore", items: entries.filter((entry) => !entry.archived)
        .map((entry) => ({ id: entry.id, label: entry.name })) }]} onClose={() => setDeleteVisible(false)} onDelete={(_kind, id) => onDelete(id)} /> : null}
      {dialog ? <ChorePlannerModal mode={dialog.mode} date={dialog.date} initialEntryId={dialog.entryId}
        entries={dialog.mode === "remove" ? active : dialog.mode === "add" ? entries.filter((entry) => !entry.archived && !entry.choreTracking?.active)
          : dialog.mode === "update" ? active.filter((entry) => entry.choreTracking?.schedules.some((item) => chorePlanDate(entry, item, todayKey))) : entries.filter((entry) => !entry.archived)}
        onClose={() => setDialog(undefined)} onSave={onUpdate} /> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {reminderNotice ? <Text accessibilityRole="alert" style={styles.note}>{reminderNotice}</Text> : null}
      <View style={[styles.layout, columns && styles.columns]}>
        <View style={[styles.section, columns && styles.listColumn]}>
          <View style={styles.heading}>
            <Text style={styles.title}>My chores</Text>
            <View ref={anchor} collapsable={false} style={styles.optionsAnchor}><Button disabled={saving} icon="options" iconOnly label="Chore options" onPress={openOptions} variant="secondary" /></View>
          </View>
          <Text style={styles.note}>Your active chore list</Text>
          <View style={[styles.panel, SOFT_SHADOW]}>
            {!active.length ? <Text style={styles.note}>No chores in your list yet. Use Options to add one.</Text> : null}
            {active.map((entry) => {
              // Reuse today's completion or planned occurrence so this checkbox never adds a duplicate.
              const completed = entry.choreTracking?.completions.filter((item) => item.completedDate === todayKey)
                .sort((a, b) => b.dueDate.localeCompare(a.dueDate))[0];
              const occurrence = completed ?? todayItems.find((item) => item.entryId === entry.id && !item.completedDate);
              return (
                <View key={entry.id} style={[styles.row, completed && styles.done]}>
                  <Button checked={!!completed} disabled={saving} label={`${entry.name}, done today`}
                    onPress={() => { void update(entry.id, { type: "toggle", key: occurrence?.key ?? `manual:${todayKey}`, dueDate: occurrence?.dueDate ?? todayKey }); }} />
                  <View style={styles.details}><Text style={styles.name}>{entry.name}</Text></View>
                  <Button disabled={saving} icon="calendar" iconOnly label={`Plan ${entry.name}`} onPress={() => plan(entry.id)} variant="secondary" />
                </View>
              );
            })}
          </View>
        </View>
        <View style={[styles.section, columns && styles.listColumn]}>
          <View style={styles.heading}><Text style={styles.title}>Chores for today</Text></View>
          <Text style={styles.note}>Today · {today.toLocaleDateString("en-GB")}</Text>
          <View style={[styles.panel, SOFT_SHADOW]}>
            {!todayItems.length ? <Text style={styles.note}>No chores due today.</Text> : todayItems.map(occurrenceRow)}
          </View>
        </View>
        <View style={[styles.section, columns && styles.calendarColumn]}>
          <View style={styles.heading}><Text style={styles.title}>Calendar</Text></View>
          <Text style={styles.note}>Choose a day to view or plan chores.</Text>
          <Calendar value={selectedDate} onChange={setSelectedDate} onMonthChange={setVisibleMonth} dayCounts={counts} countLabel="planned or completed chores" />
          {calendarItems.some((item) => item.estimated) || selectedItems.some((item) => item.estimated)
            ? <Text style={styles.note}>Estimated repeat dates adjust when you complete the chore.</Text> : null}
          <View style={[styles.panel, SOFT_SHADOW]}>
            <Text style={styles.subtitle}>{selectedDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</Text>
            {selectedItems.length ? selectedItems.map(occurrenceRow) : <Text style={styles.note}>No chores planned for this date.</Text>}
            <View style={styles.actions}><Button icon="calendar" label="Add a chore for this date" onPress={() => plan()} /></View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Shared clay surfaces and headings keep all three panels aligned with the habit pages.
  page: { gap: 14 }, layout: { gap: 22 }, columns: { alignItems: "flex-start", flexDirection: "row" },
  section: { gap: 12, minWidth: 0 }, listColumn: { flex: 1 }, calendarColumn: { flex: 1.8 },
  heading: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 12, minHeight: 36 },
  optionsAnchor: { flexDirection: "row", width: 36 }, menuOverlay: { flex: 1 },
  panel: { backgroundColor: COLORS.surface, borderRadius: 24, gap: 14, padding: 18 },
  // Today and selected-date lists share one compact Android checkbox/name row.
  row: { alignItems: "center", backgroundColor: COLORS.background, borderRadius: 18, flexDirection: "row", gap: Platform.OS === "android" ? 9 : 6, padding: 10, ...(Platform.OS === "android" ? { paddingVertical: 5, minHeight: 54 } : {}) },
  done: { backgroundColor: COLORS.mutedSurface }, details: { flex: 1, gap: Platform.OS === "android" ? 2 : 5, minWidth: 0 }, actions: { flexDirection: "row", marginTop: 4 },
  title: { color: COLORS.primary, fontFamily: FONT_FAMILY.extraBold, fontSize: 21 },
  subtitle: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 17 },
  name: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: Platform.OS === "android" ? 15 : 16 },
  note: { color: COLORS.mutedText, fontFamily: FONT_FAMILY.regular, fontSize: Platform.OS === "android" ? 12 : 14 },
  error: { color: COLORS.gradientPlum, fontFamily: FONT_FAMILY.medium, fontSize: 14 },
});
