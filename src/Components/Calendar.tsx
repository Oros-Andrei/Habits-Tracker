import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SectionIcon } from "./SectionIcon";
import { COLORS, SOFT_SHADOW } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";
import { getLocalDateKey } from "../Resources/trackerStorage";

type CalendarProps = {
  value: Date;
  onChange: (date: Date) => void;
  // Optional counts let the habit calendar share the existing date-picker grid.
  dayCounts?: Record<string, number>;
  // Category-specific labels let both habit tabs share one accessible calendar.
  countLabel?: string;
  // Planners derive counts for the visible month, including its neighboring date cells.
  onMonthChange?: (month: Date) => void;
};

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

// Clay chevrons keep month navigation aligned with the shared date controls.
export function Calendar({ value, onChange, dayCounts, countLabel = "habits completed", onMonthChange }: CalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  useEffect(() => { onMonthChange?.(visibleMonth); }, [visibleMonth, onMonthChange]);
  const days = useMemo(() => {
    const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const mondayOffset = (first.getDay() + 6) % 7;
    const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset);
    return Array.from({ length: 42 }, (_, index) =>
      new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index),
    );
  }, [visibleMonth]);

  const shiftMonth = (amount: number) =>
    setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + amount, 1));

  return (
    <View style={[styles.calendar, SOFT_SHADOW]}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Previous month" onPress={() => shiftMonth(-1)} style={styles.monthButton}>
          <SectionIcon name="chevronLeft" size={18} />
        </Pressable>
        <Text style={styles.monthTitle}>
          {visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </Text>
        <Pressable accessibilityLabel="Next month" onPress={() => shiftMonth(1)} style={styles.monthButton}>
          <SectionIcon name="chevronRight" size={18} />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {WEEKDAYS.map((day, index) => (
          <Text key={`${day}-${index}`} style={styles.weekday}>{day}</Text>
        ))}
        {days.map((day) => {
          const inMonth = day.getMonth() === visibleMonth.getMonth();
          const selected = day.toDateString() === value.toDateString();
          const count = dayCounts?.[getLocalDateKey(day)] ?? 0;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${day.toLocaleDateString()}${dayCounts ? `, ${count} ${countLabel}` : ""}`}
              accessibilityState={{ selected }}
              key={day.toISOString()}
              onPress={() => onChange(day)}
              style={[styles.dayCell, dayCounts !== undefined && styles.historyDayCell]}
            >
              <View style={[styles.dayCircle, selected && styles.selectedDay]}>
                <Text style={[styles.day, !inMonth && styles.outsideMonth, selected && styles.selectedText]}>
                  {day.getDate()}
                </Text>
              </View>
              {dayCounts !== undefined ? (
                <Text style={styles.count}>{count > 0 ? count : " "}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: {
    backgroundColor: COLORS.surface,
    borderColor: "#EEE7DE",
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
  },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  monthButton: { alignItems: "center", borderRadius: 14, height: 36, justifyContent: "center", width: 36 },
  // Use shared Nunito weights throughout the date grid.
  monthTitle: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  weekday: { color: COLORS.mutedText, fontFamily: FONT_FAMILY.bold, fontSize: 12, paddingVertical: 7, textAlign: "center", width: `${100 / 7}%` },
  dayCell: { alignItems: "center", justifyContent: "center", paddingVertical: 2, width: `${100 / 7}%` },
  // Give completion counts their own space without changing compact date pickers.
  historyDayCell: { minHeight: 64 },
  count: { color: COLORS.secondary, fontFamily: FONT_FAMILY.bold, fontSize: 12 },
  dayCircle: { alignItems: "center", borderRadius: 999, height: 34, justifyContent: "center", width: 34 },
  selectedDay: { backgroundColor: COLORS.secondary },
  day: { color: COLORS.primary, fontFamily: FONT_FAMILY.medium, fontSize: 13 },
  outsideMonth: { color: "#B7B0A8" },
  selectedText: { color: COLORS.white },
});
