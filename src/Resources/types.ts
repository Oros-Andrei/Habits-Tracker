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

// Both habit categories share actions while keeping their saved membership and history independent.
export type HabitEntryType = "goodHabit" | "badHabit";
export type HabitAction = "add" | "remove" | "toggleDone";
type HabitTracking = { active: boolean; completedDates: string[] };

// Keep planned dates separate from actual completion dates and device notification state.
export type ChoreSchedule = {
  id: string;
  startDate: string;
  repeat?: { every: number; unit: "days" | "weeks" | "months"; basis: "fixed" | "completion" };
  reminderTime?: string;
  stopped?: boolean;
};
export type ChoreCompletion = { key: string; scheduleId?: string; dueDate: string; completedDate: string };
export type ChoreTracking = { active: boolean; schedules: ChoreSchedule[]; completions: ChoreCompletion[] };
export type ChoreAction =
  | { type: "add" | "remove" }
  | { type: "schedule"; schedule: Omit<ChoreSchedule, "id" | "stopped"> }
  | { type: "toggle"; key: string; dueDate: string };

export type TrackerEntry = {
  id: string;
  name: string;
  type: TrackerEntryType;
  goodHabitTracking?: HabitTracking;
  badHabitTracking?: HabitTracking;
  choreTracking?: ChoreTracking;
  // Null explicitly detaches an expense; undefined keeps legacy imports compatible.
  expenseCategoryId?: string | null;
};

// Money is stored as whole bani so balances and pie totals avoid floating-point rounding.
export type ExpenseSource = "salary" | "mealTickets";
export type ExpenseCategory = { id: string; name: string; color: string; active: boolean };
export type ExpenseRecord = {
  id: string; expenseId: string; expenseName: string; categoryId: string; categoryName: string; categoryColor: string;
  date: string; amountBani: number; source: ExpenseSource; note: string;
};
export type IncomeVersion = { id: string; source: ExpenseSource; effectiveMonth: string; amountBani: number; payDay: number };
export type ExpenseBook = { categories: ExpenseCategory[]; records: ExpenseRecord[]; incomes: IncomeVersion[] };
export type TrackerSnapshot = { entries: TrackerEntry[]; expenses: ExpenseBook };
export type ExpenseAction =
  | { type: "createCategory"; name: string; color: string }
  | { type: "removeCategory"; categoryId: string }
  | { type: "createExpense"; name: string; categoryId: string }
  | { type: "assign"; expenseId: string; categoryId: string }
  | { type: "unassign"; expenseId: string }
  | { type: "record"; expenseId: string; date: string; amountBani: number; source: ExpenseSource; note: string }
  | { type: "removeRecord"; recordId: string }
  | { type: "income"; source: ExpenseSource; amountBani: number; payDay: number };

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
