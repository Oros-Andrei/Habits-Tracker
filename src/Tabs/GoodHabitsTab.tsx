import { useEffect, useRef, useState, type ComponentRef } from "react";
import { AppState, Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { ActionMenu } from "../Components/ActionMenu";
import { Button } from "../Components/Button";
import { Calendar } from "../Components/Calendar";
import { TrackerEntryPickerModal } from "../Components/AddEntryModal";
import { TrackerEntryList } from "../Components/TrackerEntryList";
import { getLocalDateKey } from "../Resources/trackerStorage";
import { COLORS, SOFT_SHADOW } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";
import type { HabitAction, HabitEntryType, TrackerEntry } from "../Resources/types";

export type HabitTrackerTabProps = {
  entries: TrackerEntry[];
  habitType: HabitEntryType;
  onCreate: () => void;
  onUpdate: (id: string, action: HabitAction) => Promise<void>;
};

// Both tabs render the same controls and styles so their behavior cannot drift apart.
export function GoodHabitsTab(props: Omit<HabitTrackerTabProps, "habitType">) {
  return <HabitTrackerTab {...props} habitType="goodHabit" />;
}

// Keep today's checklist above the calendar on Android and beside it on a wide browser.
export function HabitTrackerTab({ entries, habitType, onCreate, onUpdate }: HabitTrackerTabProps) {
  const isGood = habitType === "goodHabit";
  const habitWord = isGood ? "good" : "bad";
  const trackingField = isGood ? "goodHabitTracking" : "badHabitTracking";
  const { width, height } = useWindowDimensions();
  const sideBySide = Platform.OS === "web" && width >= 1000;
  const [today, setToday] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  // Reveal add/remove pickers on demand and anchor a dismissible popup to the heading's Options button.
  const [editMode, setEditMode] = useState<"add" | "remove">();
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 12, top: 12 });
  // Measure the mounted View element rather than its component function.
  const optionsAnchor = useRef<ComponentRef<typeof View>>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const todayKey = getLocalDateKey(today);
  const selectedKey = getLocalDateKey(selectedDate);
  const active = entries.filter((entry) => entry[trackingField]?.active);
  const available = entries.filter((entry) => !entry[trackingField]?.active);
  const completed = entries.filter((entry) => entry[trackingField]?.completedDates.includes(selectedKey));
  const pickerEntries = editMode === "remove" ? active : available;
  const menuWidth = Math.min(320, width - 24);
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    for (const date of entry[trackingField]?.completedDates ?? []) {
      counts[date] = (counts[date] ?? 0) + 1;
    }
  }

  // Refresh at local midnight and after resume so yesterday's checkmarks cannot carry over.
  useEffect(() => {
    const now = new Date();
    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(() => setToday(new Date()), nextDay.getTime() - now.getTime() + 100);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setToday(new Date());
    });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [todayKey]);

  // Wait for persistence and expose retryable failures without changing the visible saved state.
  const updateHabit = async (id: string, action: HabitAction) => {
    if (saving) return;
    setSaving(true);
    setError("");
    setToday(new Date());
    try {
      await onUpdate(id, action);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save this change. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // A modal backdrop dismisses outside presses on both platforms without covering menu actions.
  const openOptions = () => {
    optionsAnchor.current?.measureInWindow((x, y, _width, buttonHeight) => {
      setMenuPosition({ left: x, top: y + buttonHeight + 8 });
      setOptionsVisible(true);
    });
  };
  const chooseMode = (mode: "add" | "remove") => {
    setOptionsVisible(false);
    setError("");
    setEditMode(mode);
  };

  return (
    <View style={[styles.layout, sideBySide && styles.columns]}>
      <Modal animationType="none" onRequestClose={() => setOptionsVisible(false)} transparent visible={optionsVisible}>
        <View style={styles.menuOverlay}>
          <Pressable accessibilityLabel={`Close ${habitWord} habit options`} accessibilityRole="button" onPress={() => setOptionsVisible(false)} style={StyleSheet.absoluteFill} />
          <ActionMenu
            visible={optionsVisible}
            menuStyle={{
              left: Math.max(12, Math.min(menuPosition.left, width - menuWidth - 12)),
              minWidth: 0,
              top: Math.max(12, Math.min(menuPosition.top, height - 200)),
              width: menuWidth,
            }}
            actions={[
              { id: "create", label: "Add a new habit", icon: isGood ? "goodHabits" : "badHabits", onPress: () => { setOptionsVisible(false); setEditMode(undefined); setError(""); onCreate(); } },
              { id: "add", label: `Add a ${habitWord} habit to the list`, icon: "add", onPress: () => chooseMode("add") },
              // Keep removal visually distinct from dismissal in both habit menus.
              { id: "remove", label: "Remove a habit", icon: "removeHabit", onPress: () => chooseMode("remove") },
            ]}
          />
        </View>
      </Modal>
      {/* Membership actions use a closeable shared dialog instead of changing the daily-list card. */}
      {editMode ? (
        <TrackerEntryPickerModal
          entries={pickerEntries}
          habitType={habitType}
          key={editMode}
          mode={editMode}
          onClose={() => setEditMode(undefined)}
          onSave={(id) => onUpdate(id, editMode)}
        />
      ) : null}
      <View style={[styles.listSection, sideBySide && styles.listColumn]}>
        {/* Match the calendar header by keeping the list title and local date outside its card. */}
        <View style={styles.sectionHeading}>
          <Text style={styles.title}>My {habitWord} habits</Text>
          <View collapsable={false} ref={optionsAnchor} style={styles.optionsAnchor}>
            <Button disabled={saving} icon="options" iconOnly label={`${isGood ? "Good" : "Bad"} habit options`} onPress={openOptions} variant="secondary" />
          </View>
        </View>
        <Text style={styles.description}>Today · {today.toLocaleDateString("en-GB")}</Text>
        <View style={[styles.listPanel, SOFT_SHADOW]}>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {active.length === 0 ? <Text style={styles.description}>No habits in your daily list yet. Use Options to add one.</Text> : null}
          {active.map((entry) => {
            const done = entry[trackingField]?.completedDates.includes(todayKey) ?? false;
            return (
              <View key={entry.id} style={[styles.habit, done && styles.completedHabit]}>
                {/* Keep daily completion beside the habit while removal stays in Options. */}
                <Button
                  checked={done}
                  disabled={saving}
                  label={`${entry.name}, ${isGood ? "done" : "recorded"} today`}
                  onPress={() => { void updateHabit(entry.id, "toggleDone"); }}
                />
                <View style={styles.habitDetails}>
                  <Text style={styles.name}>{entry.name}</Text>
                  <Text style={styles.description}>{isGood ? done ? "Done today" : "Not done today" : done ? "Recorded today" : "Not recorded today"}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
      <View style={[styles.calendarPanel, sideBySide && styles.calendarColumn]}>
        <View style={styles.sectionHeading}>
          <Text style={styles.title}>Calendar</Text>
        </View>
        <Text style={styles.description}>Numbers show how many habits you {isGood ? "completed" : "recorded"} each day.</Text>
        <Calendar countLabel={isGood ? "habits completed" : "habits recorded"} dayCounts={counts} onChange={setSelectedDate} value={selectedDate} />
        {/* History includes habits removed from the daily list and is read-only for past dates. */}
        <View style={[styles.history, SOFT_SHADOW]}>
          {/* Keep history dates in European day-month-year order regardless of browser locale. */}
          <Text style={styles.subtitle}>
            {selectedDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </Text>
          <Text style={styles.description}>{completed.length} habits {isGood ? "completed" : "recorded"}</Text>
          <TrackerEntryList emptyMessage={`No habits ${isGood ? "completed" : "recorded"} on this date.`} entries={completed} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Let both panels shrink on the browser while preserving the list-first phone order.
  layout: { gap: 22 },
  columns: { alignItems: "flex-start", flexDirection: "row" },
  // Align both section headers and keep the open habit picker above the following calendar.
  listSection: { gap: 12, minWidth: 0, zIndex: 1 },
  // Align both headings while keeping the compact Options trigger beside the habit title.
  sectionHeading: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 12, minHeight: 36 },
  optionsAnchor: { flexDirection: "row", width: 36 },
  menuOverlay: { flex: 1 },
  listPanel: { backgroundColor: COLORS.surface, borderRadius: 24, gap: 14, minWidth: 0, padding: 20 },
  listColumn: { flex: 1 },
  calendarPanel: { gap: 12, minWidth: 0 },
  calendarColumn: { flex: 2 },
  title: { color: COLORS.primary, fontFamily: FONT_FAMILY.extraBold, fontSize: 21 },
  subtitle: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 17 },
  description: { color: COLORS.mutedText, fontFamily: FONT_FAMILY.regular, fontSize: 14 },
  // Keep the checkbox and wrapping habit details together in one horizontal row.
  habit: { alignItems: "center", backgroundColor: COLORS.background, borderRadius: 18, flexDirection: "row", gap: 10, padding: 14 },
  habitDetails: { flex: 1, gap: 6, minWidth: 0 },
  completedHabit: { backgroundColor: COLORS.mutedSurface },
  name: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 16 },
  history: { backgroundColor: COLORS.surface, borderRadius: 22, gap: 10, padding: 18 },
  error: { color: COLORS.gradientPlum, fontFamily: FONT_FAMILY.medium, fontSize: 14 },
});
