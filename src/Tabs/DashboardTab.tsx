import { useEffect, useState } from "react";
import { AppState, Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { StatCard } from "../Components/StatCard";
import { TrackerDialog } from "../Components/AddEntryModal";
import { ExpensePieChart } from "../Components/ExpensePieChart";
import { Calendar } from "../Components/Calendar";
// Keep funding-source labels correct for Savings payments in dashboard history too.
import { emptyExpenseBook, expenseSourceLabel, formatLei } from "../Resources/expenseLedger";
import { choreDate, listChoreOccurrences } from "../Resources/choreSchedule";
import { COLORS, SOFT_SHADOW } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";
import { getLocalDateKey } from "../Resources/trackerStorage";
import type { ExpenseBook, StatMetric, TrackerEntry } from "../Resources/types";

// Period totals reuse the soft-clay icons from section navigation.
const monthlyMetrics: StatMetric[] = [
  { id: "good", label: "Good", value: "0", icon: "goodHabits" },
  { id: "bad", label: "Bad", value: "0", icon: "badHabits" },
  { id: "expenses", label: "Expenses", value: "0,00 lei", icon: "expenses" },
  { id: "chores", label: "Chores", value: "0", icon: "chores" },
];

const yearlyMetrics: StatMetric[] = [
  { id: "good", label: "Good", value: "0", icon: "goodHabits" },
  { id: "bad", label: "Bad", value: "0", icon: "badHabits" },
  { id: "expenses", label: "Expenses", value: "0,00 lei", icon: "expenses" },
  { id: "chores", label: "Chores", value: "0", icon: "chores" },
];

// Count checked habit-days for each period, including the history of habits removed from the list.
export function DashboardTab({ entries, expenses = emptyExpenseBook() }: { entries: TrackerEntry[]; expenses?: ExpenseBook }) {
  // Match desktop columns while keeping both summary cards before the widgets on Android.
  const { width, fontScale } = useWindowDimensions();
  const columns = Platform.OS === "web" && width >= 1000;
  const [today, setToday] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  // Both period cards open the same per-habit monthly and yearly breakdown.
  const [selectedHabitType, setSelectedHabitType] = useState<"goodHabit" | "badHabit" | "chore">();
  // Expense tiles open the matching period's recorded payments and category chart.
  const [expensePeriod, setExpensePeriod] = useState<"month" | "year">();
  const todayKey = getLocalDateKey(today);
  const monthKey = todayKey.slice(0, 7);
  const yearKey = todayKey.slice(0, 4);
  const paid = expenses.records.filter((record) => record.date <= todayKey);
  const monthlyPayments = paid.filter((record) => record.date.startsWith(monthKey));
  const yearlyPayments = paid.filter((record) => record.date.startsWith(yearKey));
  const monthlyExpenses = monthlyPayments.reduce((sum, record) => sum + record.amountBani, 0);
  const yearlyExpenses = yearlyPayments.reduce((sum, record) => sum + record.amountBani, 0);
  const selectedPayments = expensePeriod === "month" ? monthlyPayments : yearlyPayments;
  // Derive the same 42-day chore grid and completion-based estimates used by the Chores tab.
  const preview = { includeEstimates: true, today: todayKey };
  const selectedKey = getLocalDateKey(selectedDate);
  const selectedChores = listChoreOccurrences(entries, selectedKey, selectedKey, preview);
  const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1, 12);
  first.setDate(1 - (first.getDay() + 6) % 7);
  const last = new Date(first); last.setDate(last.getDate() + 41);
  const calendarChores = listChoreOccurrences(entries, getLocalDateKey(first), getLocalDateKey(last), preview);
  const choreCountsByDate: Record<string, number> = {};
  for (const item of calendarChores) choreCountsByDate[item.dueDate] = (choreCountsByDate[item.dueDate] ?? 0) + 1;
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
  const monthly = monthlyMetrics.map((metric) => metric.id === "good" ? { ...metric, value: String(monthlyGood) } : metric.id === "bad" ? { ...metric, value: String(monthlyBad) } : metric.id === "chores" ? { ...metric, value: String(monthlyChores) } : { ...metric, value: formatLei(monthlyExpenses) });
  const yearly = yearlyMetrics.map((metric) => metric.id === "good" ? { ...metric, value: String(yearlyGood) } : metric.id === "bad" ? { ...metric, value: String(yearlyBad) } : metric.id === "chores" ? { ...metric, value: String(yearlyChores) } : { ...metric, value: formatLei(yearlyExpenses) });
  // Reserve a wider currency column and use its longest amount to size both Android cards alike.
  const currencyUnits = Math.max(...[formatLei(monthlyExpenses), formatLei(yearlyExpenses)].map((value) =>
    [...value].reduce((units, char) => units + (/\d/.test(char) ? 0.62 : char === "e" ? 0.55 : 0.3), 0)));
  const currencyFontSize = Platform.OS === "android" ? Math.max(11, Math.min(22, ((width - 82) * 1.45 / 4.45 - 10) / (fontScale ?? 1) / currencyUnits)) : undefined;

  return (
    <View style={styles.container}>
      <View style={[styles.cards, columns && styles.columns]}>
        <View style={[styles.statSlot, columns && styles.column]}><StatCard currencyFontSize={currencyFontSize} metricActions={{ ...metricActions, expenses: () => setExpensePeriod("month") }} metrics={monthly} title="This month" tone="teal" /></View>
        <View style={[styles.statSlot, columns && styles.column]}><StatCard currencyFontSize={currencyFontSize} metricActions={{ ...metricActions, expenses: () => setExpensePeriod("year") }} metrics={yearly} title="This year" tone="forest" /></View>
      </View>
      {/* A separate widget row preserves Month, Year, pie, calendar order on smaller screens. */}
      <View style={[styles.overview, columns && styles.columns]}>
        <View style={[styles.overviewSection, columns && styles.column]}>
          <Text style={styles.sectionTitle}>Spending this month</Text>
          <View style={[styles.panel, SOFT_SHADOW]}><ExpensePieChart records={monthlyPayments} /></View>
        </View>
        <View style={[styles.overviewSection, columns && styles.column]}>
          <Text style={styles.sectionTitle}>Chores calendar</Text>
          <Calendar value={selectedDate} onChange={setSelectedDate} onMonthChange={setVisibleMonth}
            dayCounts={choreCountsByDate} countLabel="planned or completed chores" />
          {calendarChores.some((item) => item.estimated) || selectedChores.some((item) => item.estimated)
            ? <Text style={styles.detailNote}>Estimated repeat dates adjust when you complete the chore.</Text> : null}
          <View style={[styles.panel, SOFT_SHADOW]}>
            <Text style={styles.dateTitle}>{selectedDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</Text>
            {selectedChores.length ? selectedChores.map((item) => <View key={`${item.entryId}:${item.key}`} style={styles.countRow}>
              <View style={styles.choreDetails}><Text style={styles.habitName}>{item.name}</Text>
                <Text style={styles.detailNote}>{item.completedDate ? `Done · ${choreDate(item.completedDate).toLocaleDateString("en-GB")}`
                  : `${item.estimated ? "Estimated" : item.dueDate < todayKey ? "Overdue" : "Due"} · ${choreDate(item.dueDate).toLocaleDateString("en-GB")}${item.reminderTime ? ` · ${item.reminderTime}` : ""}`}</Text>
              </View>
            </View>) : <Text style={styles.detailNote}>No chores planned for this date.</Text>}
          </View>
        </View>
      </View>
      {expensePeriod ? <TrackerDialog title={expensePeriod === "month" ? "Expenses this month" : "Expenses this year"}
        description="Recorded payments in lei, grouped by their original category." onClose={() => setExpensePeriod(undefined)} closeLabel="Close expense totals">
        <ExpensePieChart records={selectedPayments} />
        {[...selectedPayments].sort((a, b) => b.date.localeCompare(a.date)).map((record) => <View key={record.id} style={styles.countRow}>
          <View style={styles.habitName}><Text style={styles.habitName}>{record.expenseName}</Text>
            <Text style={styles.detailNote}>{record.categoryName} · {record.date.split("-").reverse().join("/")} · {expenseSourceLabel(record.source)}</Text></View>
          <Text style={styles.paymentAmount}>{formatLei(record.amountBani)}</Text>
        </View>)}
      </TrackerDialog> : null}
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
  // Equal gaps and columns align each widget with its summary card above.
  cards: { gap: 20 }, columns: { flexDirection: "row", alignItems: "flex-start" },
  statSlot: { flexDirection: "row", minWidth: 0 }, column: { flex: 1 },
  overview: { gap: 20 }, overviewSection: { gap: 14, minWidth: 0 },
  panel: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 18, gap: 12 },
  sectionTitle: { color: COLORS.primary, fontFamily: FONT_FAMILY.extraBold, fontSize: 21 },
  dateTitle: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 17 },
  choreDetails: { flex: 1, minWidth: 0, gap: 5 },
  // Keep habit names readable beside aligned period counts on both phone and browser dialogs.
  habitCounts: { gap: 8 },
  countHeader: { alignItems: "center", flexDirection: "row", gap: 10, paddingHorizontal: 12 },
  countRow: { alignItems: "center", backgroundColor: COLORS.background, borderRadius: 14, flexDirection: "row", gap: 10, padding: 12 },
  habitName: { color: COLORS.primary, flex: 1, fontFamily: FONT_FAMILY.medium, fontSize: 15, minWidth: 0 },
  habitCount: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 15, textAlign: "right", width: 72 },
  headerText: { color: COLORS.mutedText, fontFamily: FONT_FAMILY.bold, fontSize: 12 },
  detailNote: { color: COLORS.mutedText, fontFamily: FONT_FAMILY.regular, fontSize: 14 },
  paymentAmount: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 14 },
});
