import { StyleSheet, View } from "react-native";
import { StatCard } from "../Components/StatCard";
import type { StatMetric } from "../Resources/types";

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

// These zeroed cards establish the agreed dashboard layout before statistics are wired to data.
export function DashboardTab() {
  return (
    <View style={styles.container}>
      <View style={styles.cards}>
        <StatCard metrics={monthlyMetrics} title="This month" tone="teal" />
        <StatCard metrics={yearlyMetrics} title="This year" tone="forest" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 18 },
  cards: { flexDirection: "row", flexWrap: "wrap", gap: 20 },
});
