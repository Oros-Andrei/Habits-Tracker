import { HabitTrackerTab, type HabitTrackerTabProps } from "./GoodHabitsTab";

// Reuse the good-habit layout; a checked bad habit records an occurrence for the current day.
export function BadHabitsTab(props: Omit<HabitTrackerTabProps, "habitType">) {
  return <HabitTrackerTab {...props} habitType="badHabit" />;
}
