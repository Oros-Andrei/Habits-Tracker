import { useEffect, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { StatCard } from "../Components/StatCard";
import { TrackerDialog } from "../Components/AddEntryModal";
import { COLORS } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";
import { getLocalDateKey } from "../Resources/trackerStorage";
import type { StatMetric, TrackerEntry } from "../Resources/types";

// Period totals reuse the soft-clay icons from section navigation.
const monthlyMetrics: StatMetric[] = [
  { id: "good", label: "Good", value: "0", icon: "goodHabits" },
  { id: "bad", label: "Bad", value: "0", icon: "badHabits" },
  { id: "expenses", label: "Expenses", value: "$0", icon: "expenses" },
  { id: "chores", label: "Chores", value: "0", icon: "chores" },
];

const yearlyMetrics: StatMetric[] = [
  { id: "good", label: "Good", value: "0", icon: "goodHabits" },
  { id: "bad", label: "Bad", value: "0", icon: "badHabits" },
  { id: "expenses", label: "Expenses", value: "$0", icon: "expenses" },
  { id: "chores", label: "Chores", value: "0", icon: "chores" },
];

// Count checked habit-days for each period, including the history of habits removed from the list.
export function DashboardTab({ entries }: { entries: TrackerEntry[] }) {
  const [today, setToday] = useState(() => new Date());
  // Both period cards open the same per-habit monthly and yearly breakdown.
  const [selectedHabitType, setSelectedHabitType] = useState<"goodHabit" | "badHabit" | "chore">();
  const todayKey = getLocalDateKey(today);
  const monthKey = todayKey.slice(0, 7);
  const yearKey = todayKey.slice(0, 4);
  // Use one set of per-habit counts for both the totals and their details.
  const habitCounts = entries
    // Chore totals count actual completion days, including archived and overdue tasks finished later.
    .filter((entry) => entry.type === "goodHabit" || entry.type === "badHabit" || entry.type === "chore")
    .map((entry) => {
      let monthly = 0;
      let yearly = 0;
      const dates = entry.type === "chore" ? entry.choreTracking?.completions.map((item) => item.completedDate) ?? []
        : (entry.type === "goodHabit" ? entry.goodHabitTracking : entry.badHabitTracking)?.completedDates ?? [];
      for (const date of dates) {
        if (date > todayKey) continue;
        if (date.startsWith(monthKey)) monthly += 1;
        if (date.startsWith(yearKey)) yearly += 1;
      }
      return { id: entry.id, name: entry.name, type: entry.type, monthly, yearly };
    });
  const goodCounts = habitCounts.filter((habit) => habit.type === "goodHabit");
  // Bad totals and details use the same recorded-day rules as Good totals.
  const badCounts = habitCounts.filter((habit) => habit.type === "badHabit");
  const monthlyBad = badCounts.reduce((total, habit) => total + habit.monthly, 0);
  const yearlyBad = badCounts.reduce((total, habit) => total + habit.yearly, 0);
  const monthlyGood = goodCounts.reduce((total, habit) => total + habit.monthly, 0);
  const yearlyGood = goodCounts.reduce((total, habit) => total + habit.yearly, 0);
  const choreCounts = habitCounts.filter((item) => item.type === "chore");
  const monthlyChores = choreCounts.reduce((total, item) => total + item.monthly, 0);
  const yearlyChores = choreCounts.reduce((total, item) => total + item.yearly, 0);
  const selectedHabits = habitCounts.filter((habit) => habit.type === selectedHabitType);
  const metricActions = {
    good: () => setSelectedHabitType("goodHabit"),
    bad: () => setSelectedHabitType("badHabit"),
    chores: () => setSelectedHabitType("chore"),
  };

  // Recompute the reporting periods at local midnight and when the app resumes.
  useEffect(() => {
    const now = new Date();
    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(() => setToday(new Date()), nextDay.getTime() - now.getTime() + 100);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setToday(new Date());
    });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [todayKey]);
  const monthly = monthlyMetrics.map((metric) => metric.id === "good" ? { ...metric, value: String(monthlyGood) } : metric.id === "bad" ? { ...metric, value: String(monthlyBad) } : metric.id === "chores" ? { ...metric, value: String(monthlyChores) } : metric);
  const yearly = yearlyMetrics.map((metric) => metric.id === "good" ? { ...metric, value: String(yearlyGood) } : metric.id === "bad" ? { ...metric, value: String(yearlyBad) } : metric.id === "chores" ? { ...metric, value: String(yearlyChores) } : metric);

  return (
    <View style={styles.container}>
      <View style={styles.cards}>
        <StatCard metricActions={metricActions} metrics={monthly} title="This month" tone="teal" />
        <StatCard metricActions={metricActions} metrics={yearly} title="This year" tone="forest" />
      </View>
      {selectedHabitType ? (
        <TrackerDialog
          closeLabel="Close recorded counts"
          description="Recorded counts for this month and calendar year."
          onClose={() => setSelectedHabitType(undefined)}
          title={selectedHabitType === "chore" ? "Chores" : selectedHabitType === "goodHabit" ? "Good habits" : "Bad habits"}
        >
          {selectedHabits.length > 0 ? (
            <View style={styles.habitCounts}>
              <View style={styles.countHeader}>
                <Text style={[styles.habitName, styles.headerText]}>{selectedHabitType === "chore" ? "Chore" : "Habit"}</Text>
                <Text style={[styles.habitCount, styles.headerText]}>This month</Text>
                <Text style={[styles.habitCount, styles.headerText]}>This year</Text>
              </View>
              {selectedHabits.map((habit) => (
                <View key={habit.id} style={styles.countRow}>
                  <Text style={styles.habitName}>{habit.name}</Text>
                  <Text style={styles.habitCount}>{habit.monthly}</Text>
                  <Text style={styles.habitCount}>{habit.yearly}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.detailNote}>{selectedHabitType === "chore" ? "No chores have been created yet." : `No ${selectedHabitType === "goodHabit" ? "good" : "bad"} habits have been created yet.`}</Text>
          )}
        </TrackerDialog>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 18 },
  cards: { flexDirection: "row", flexWrap: "wrap", gap: 20 },
  // Keep habit names readable beside aligned period counts on both phone and browser dialogs.
  habitCounts: { gap: 8 },
  countHeader: { alignItems: "center", flexDirection: "row", gap: 10, paddingHorizontal: 12 },
  countRow: { alignItems: "center", backgroundColor: COLORS.background, borderRadius: 14, flexDirection: "row", gap: 10, padding: 12 },
  habitName: { color: COLORS.primary, flex: 1, fontFamily: FONT_FAMILY.medium, fontSize: 15, minWidth: 0 },
  habitCount: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 15, textAlign: "right", width: 72 },
  headerText: { color: COLORS.mutedText, fontFamily: FONT_FAMILY.bold, fontSize: 12 },
  detailNote: { color: COLORS.mutedText, fontFamily: FONT_FAMILY.regular, fontSize: 14 },
});
