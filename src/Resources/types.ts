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
  // Identify the saved plan explicitly so editing never changes another plan for the same chore.
  | { type: "updateSchedule"; scheduleId: string; schedule: Omit<ChoreSchedule, "id" | "stopped"> }
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
  // Fixed monthly amounts remain separate from actual, undoable payment records.
  monthlyExpense?: { amountBani: number; source: ExpenseSource } | null;
};

// Money is stored as whole bani so balances and pie totals avoid floating-point rounding.
// Savings can fund expenses, while only Salary and Meal tickets repeat as monthly income.
export type IncomeSource = "salary" | "mealTickets";
export type ExpenseSource = IncomeSource | "savings";
export type ExpenseCategory = { id: string; name: string; color: string; active: boolean };
export type ExpenseRecord = {
  id: string; expenseId: string; expenseName: string; categoryId: string; categoryName: string; categoryColor: string;
  date: string; amountBani: number; source: ExpenseSource; note: string;
  monthly?: true;
};
export type IncomeVersion = { id: string; source: IncomeSource; effectiveMonth: string; amountBani: number; payDay: number };
// Dated account movements and debt records preserve history without changing expense totals.
export type ExtraIncome = { id: string; date: string; amountBani: number };
export type SavingsAdjustment = { id: string; date: string; amountBani: number };
export type Loan = { id: string; name: string; date: string; amountBani: number };
export type LoanRepayment = { id: string; loanId: string; date: string; amountBani: number };
export type ExpenseBook = { categories: ExpenseCategory[]; records: ExpenseRecord[]; incomes: IncomeVersion[];
  extraIncomes: ExtraIncome[]; savingsAdjustments: SavingsAdjustment[]; loans: Loan[]; loanRepayments: LoanRepayment[] };
// Product identities are shared across supermarkets and storage locations; quantities use whole thousandths.
export type StockUnit = "bottles" | "cans" | "units" | "grams";
// Amounts to buy belong to checklist entries; legacy product amounts are retained only for migration.
export type ShoppingQuantity = { amountMilli: number; unit: "grams" | "units" };
export type ShoppingProduct = { id: string; name: string; quantity?: ShoppingQuantity };
export type Supermarket = { id: string; name: string };
export type ProductOffer = { id: string; productId: string; supermarketId: string; priceBani: number; salePriceBani: number | null };
export type InventoryLocation = { id: string; name: string };
// Expiry is optional metadata on the existing stock entry, never a separate batch identity.
export type InventoryStock = { id: string; productId: string; locationId: string; unit: StockUnit; quantityMilli: number; expiryDate: string | null };
// List membership belongs to the product; optional legacy offer links retain existing purchase history.
// Bought entries remain as undoable history while the active list contains only pending purchases.
export type ShoppingItem = { id: string; productId: string; quantity: ShoppingQuantity | null; offerId?: string; bought: boolean; boughtAt?: string; paidPriceBani?: number;
  inventoryAddition?: { stockId: string; quantityMilli: number } };
export type ShoppingBook = { products: ShoppingProduct[]; supermarkets: Supermarket[]; offers: ProductOffer[];
  items: ShoppingItem[]; locations: InventoryLocation[]; stock: InventoryStock[] };
export type ShoppingAction =
  | { type: "supermarket" | "location"; name: string }
  | { type: "product"; productId?: string; name: string; supermarketId?: string; priceBani?: number; salePriceBani?: number | null }
  | { type: "price"; offerId: string; priceBani: number; salePriceBani: number | null }
  | { type: "addToList"; productId: string; quantity?: ShoppingQuantity }
  | { type: "removeFromList"; itemId: string }
  // Omitted expiry keeps an existing date; explicit null clears it when editing inventory.
  | { type: "buy"; itemId: string; inventory?: { locationId: string; unit: StockUnit; quantityMilli: number; expiryDate?: string | null } }
  | { type: "unbuy"; itemId: string; reverseInventory: boolean }
  | { type: "addStock"; productId?: string; name: string; locationId: string; unit: StockUnit; quantityMilli: number; expiryDate?: string | null }
  | { type: "setStock"; stockId: string; quantityMilli: number; expiryDate?: string | null };
export type TrackerSnapshot = { entries: TrackerEntry[]; expenses: ExpenseBook; shopping: ShoppingBook };
export type ExpenseAction =
  | { type: "createCategory"; name: string; color: string }
  | { type: "removeCategory"; categoryId: string }
  // A regular expense creates its name and paid record in one local save.
  | { type: "createPayment"; name: string; categoryId: string; date: string; amountBani: number; source: ExpenseSource }
  | { type: "createExpense"; name: string; categoryId: string; monthly?: { amountBani: number; source: ExpenseSource } }
  | { type: "assign"; expenseId: string; categoryId: string; monthly?: { amountBani: number; source: ExpenseSource } }
  | { type: "setMonthly"; expenseId: string; amountBani: number; source: ExpenseSource }
  | { type: "toggleMonthly"; expenseId: string; date: string }
  | { type: "unassign"; expenseId: string }
  | { type: "record"; expenseId: string; date: string; amountBani: number; source: ExpenseSource; note: string }
  | { type: "removeRecord"; recordId: string }
  | { type: "income"; source: IncomeSource; amountBani: number; payDay: number }
  // Loan repayments stay outside expense records and never deduct from a funding source.
  | { type: "extraIncome"; date: string; amountBani: number }
  | { type: "setSavings"; amountBani: number }
  | { type: "createLoan"; name: string; date: string; amountBani: number }
  | { type: "repayLoan"; loanId: string; date: string; amountBani: number };

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
