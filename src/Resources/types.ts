import type { ReactNode } from "react";

// A single tab model drives both platform navigation layouts.
export type TabId =
  | "dashboard"
  | "goodHabits"
  | "badHabits"
  | "expenses"
  | "chores"
  | "shopping";

export type ActionMenuItem = "add" | "import" | "export";

// Keep user-created names typed by the tracker tab they belong to.
export type TrackerEntryType = "goodHabit" | "badHabit" | "expenseType" | "chore";

export type TrackerEntry = {
  id: string;
  name: string;
  type: TrackerEntryType;
};

export type AppShellProps = {
  activeTab: TabId;
  children: ReactNode;
  menuVisible: boolean;
  onAction: (action: ActionMenuItem) => void;
  onGoHome: () => void;
  onTabChange: (tab: TabId) => void;
  onToggleMenu: () => void;
};

// Dashboard metrics point to their matching shared section icon.
export type StatMetric = {
  id: string;
  label: string;
  value: string;
  icon: "goodHabits" | "badHabits" | "expenses" | "chores";
};
