import type { ExpenseAction, ExpenseBook, ExpenseSource, TrackerEntry, TrackerSnapshot } from "./types";

export const CATEGORY_COLORS = ["#008897", "#078665", "#38242E", "#526EAD", "#885BA6", "#C36572", "#C2733E", "#AF8D31", "#477B62", "#487D91", "#8D684F", "#657180"];
const MAX_BANI = 1_000_000_000_000;
const sources = ["salary", "mealTickets"];
const normalized = (name: string) => name.trim().toLocaleLowerCase("en");
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const emptyExpenseBook = (): ExpenseBook => ({ categories: [], records: [], incomes: [] });

// Accept either decimal separator but never round a mistyped third decimal or guess thousands separators.
export function parseLei(value: string): number {
  const text = value.trim().replace(/\s/g, "");
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) throw new Error("Enter an amount in lei with at most two decimals, for example 125,50.");
  const [whole, fraction = ""] = text.split(/[.,]/);
  const bani = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(bani) || bani > MAX_BANI) throw new Error("This amount is too large.");
  return bani;
}
export function formatLei(bani: number): string {
  return `${new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(bani / 100)} lei`;
}
export function validExpenseDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return date.getFullYear() === Number(value.slice(0, 4)) && date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8, 10));
}
export function nextExpenseMonth(month: string): string {
  const date = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1, 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Validate the complete ledger and its references before saving or importing any financial data.
export function parseExpenseBook(value: unknown, entries: TrackerEntry[]): ExpenseBook {
  const fail = (): never => { throw new Error("The data contains invalid expense categories, payments, or income settings."); };
  if (!value || typeof value !== "object") return fail();
  const book = value as ExpenseBook;
  if (!Array.isArray(book.categories) || !Array.isArray(book.records) || !Array.isArray(book.incomes)) return fail();
  const text = (v: unknown): v is string => typeof v === "string" && !!v.trim();
  const money = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= MAX_BANI;
  const ids = new Set<string>(), names = new Set<string>();
  const categories = book.categories.map((category) => {
    if (!category || !text(category.id) || ids.has(category.id) || !text(category.name) || !/^#[0-9a-f]{6}$/i.test(category.color) || typeof category.active !== "boolean" ||
        (category.active && names.has(normalized(category.name)))) return fail();
    ids.add(category.id); if (category.active) names.add(normalized(category.name));
    return { id: category.id, name: category.name, color: category.color, active: category.active };
  });
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const entryMap = new Map(entries.map((entry) => [entry.id, entry]));
  for (const entry of entries) if (entry.expenseCategoryId != null && (entry.type !== "expenseType" || !categoryMap.get(entry.expenseCategoryId)?.active)) return fail();
  ids.clear();
  const records = book.records.map((record) => {
    if (!record || !text(record.id) || ids.has(record.id) || entryMap.get(record.expenseId)?.type !== "expenseType" || !categoryMap.has(record.categoryId) ||
        !text(record.expenseName) || !text(record.categoryName) || !/^#[0-9a-f]{6}$/i.test(record.categoryColor) || !validExpenseDate(record.date) ||
        !money(record.amountBani) || record.amountBani === 0 || !sources.includes(record.source) || typeof record.note !== "string") return fail();
    ids.add(record.id);
    return { id: record.id, expenseId: record.expenseId, expenseName: record.expenseName, categoryId: record.categoryId,
      categoryName: record.categoryName, categoryColor: record.categoryColor, date: record.date, amountBani: record.amountBani, source: record.source, note: record.note };
  });
  ids.clear(); const periods = new Set<string>();
  const incomes = book.incomes.map((income) => {
    const period = `${income?.source}:${income?.effectiveMonth}`;
    if (!income || !text(income.id) || ids.has(income.id) || !sources.includes(income.source) || !validExpenseDate(`${income.effectiveMonth}-01`) ||
        periods.has(period) || !money(income.amountBani) || !Number.isInteger(income.payDay) || income.payDay < 1 || income.payDay > 31) return fail();
    ids.add(income.id); periods.add(period);
    return { id: income.id, source: income.source, effectiveMonth: income.effectiveMonth, amountBani: income.amountBani, payDay: income.payDay };
  });
  if (!Number.isSafeInteger(records.reduce((total, record) => total + record.amountBani, 0))) return fail();
  return { categories, records, incomes };
}

// An expense has a single assignment; removing it never rewrites snapshots on earlier payments.
export function applyExpenseAction(current: TrackerSnapshot, action: ExpenseAction, today: string): TrackerSnapshot {
  let entries = current.entries;
  let book = current.expenses;
  const category = (categoryId: string) => {
    const item = book.categories.find((item) => item.id === categoryId && item.active);
    if (!item) throw new Error("Choose an available category.");
    return item;
  };
  const expense = (expenseId: string) => {
    const item = entries.find((item) => item.id === expenseId && item.type === "expenseType");
    if (!item) throw new Error("This expense is no longer available.");
    return item;
  };
  if (action.type === "createCategory") {
    const name = action.name.trim();
    if (!name || !CATEGORY_COLORS.includes(action.color)) throw new Error("Enter a category name and choose a colour.");
    if (book.categories.some((item) => item.active && normalized(item.name) === normalized(name))) throw new Error("This category already exists.");
    book = { ...book, categories: [...book.categories, { id: id(), name, color: action.color, active: true }] };
  } else if (action.type === "removeCategory") {
    category(action.categoryId);
    book = { ...book, categories: book.categories.map((item) => item.id === action.categoryId ? { ...item, active: false } : item) };
    entries = entries.map((item) => item.expenseCategoryId === action.categoryId ? { ...item, expenseCategoryId: null } : item);
  } else if (action.type === "createExpense") {
    category(action.categoryId);
    const name = action.name.trim();
    if (!name) throw new Error("Enter an expense name.");
    const matching = entries.filter((item) => item.type === "expenseType" && normalized(item.name) === normalized(name));
    if (matching.some((item) => item.expenseCategoryId != null)) throw new Error("This expense already belongs to a category. Remove it there before adding it elsewhere.");
    entries = matching.length ? entries.map((item) => item.id === matching[0].id ? { ...item, expenseCategoryId: action.categoryId } : item)
      : [...entries, { id: id(), name, type: "expenseType", expenseCategoryId: action.categoryId }];
  } else if (action.type === "assign") {
    category(action.categoryId); const item = expense(action.expenseId);
    if (item.expenseCategoryId != null) throw new Error("Remove this expense from its current category first.");
    entries = entries.map((item) => item.id === action.expenseId ? { ...item, expenseCategoryId: action.categoryId } : item);
  } else if (action.type === "unassign") {
    expense(action.expenseId);
    entries = entries.map((item) => item.id === action.expenseId ? { ...item, expenseCategoryId: null } : item);
  } else if (action.type === "record") {
    const item = expense(action.expenseId), group = category(item.expenseCategoryId ?? "");
    if (!validExpenseDate(action.date) || action.date > today) throw new Error("Choose today or an earlier date for a paid expense.");
    if (!Number.isSafeInteger(action.amountBani) || action.amountBani <= 0 || action.amountBani > MAX_BANI || !sources.includes(action.source)) throw new Error("Choose a payment source and an amount greater than zero.");
    book = { ...book, records: [...book.records, { id: id(), expenseId: item.id, expenseName: item.name, categoryId: group.id, categoryName: group.name,
      categoryColor: group.color, date: action.date, amountBani: action.amountBani, source: action.source, note: action.note.trim() }] };
  } else if (action.type === "removeRecord") {
    if (!book.records.some((item) => item.id === action.recordId)) throw new Error("This payment is no longer available.");
    book = { ...book, records: book.records.filter((item) => item.id !== action.recordId) };
  } else if (action.type === "income") {
    if (!sources.includes(action.source) || !Number.isSafeInteger(action.amountBani) || action.amountBani < 0 || action.amountBani > MAX_BANI || !Number.isInteger(action.payDay) || action.payDay < 1 || action.payDay > 31) throw new Error("Enter a valid monthly amount and receipt day.");
    const month = today.slice(0, 7);
    const effectiveMonth = book.incomes.some((item) => item.source === action.source) ? nextExpenseMonth(month) : month;
    const existing = book.incomes.find((item) => item.source === action.source && item.effectiveMonth === effectiveMonth);
    book = { ...book, incomes: [...book.incomes.filter((item) => item.source !== action.source || item.effectiveMonth !== effectiveMonth),
      { id: existing?.id ?? id(), source: action.source, effectiveMonth, amountBani: action.amountBani, payDay: action.payDay }] };
  }
  return { entries, expenses: parseExpenseBook(book, entries) };
}

// Monthly budgets reset to the applicable income amount; unspent balances are not added as new income.
export function incomeForMonth(book: ExpenseBook, source: ExpenseSource, month: string) {
  return book.incomes.filter((item) => item.source === source && item.effectiveMonth <= month).sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth))[0];
}
export function incomeReceiptDate(month: string, payDay: number): Date {
  const year = Number(month.slice(0, 4)), index = Number(month.slice(5, 7)) - 1;
  return new Date(year, index, Math.min(payDay, new Date(year, index + 1, 0).getDate()), 12);
}
export function expenseMonthSummary(book: ExpenseBook, month: string, today: string) {
  const records = book.records.filter((item) => item.date.startsWith(month) && item.date <= today);
  const salary = incomeForMonth(book, "salary", month), mealTickets = incomeForMonth(book, "mealTickets", month);
  const spentSalary = records.filter((item) => item.source === "salary").reduce((sum, item) => sum + item.amountBani, 0);
  const spentTickets = records.filter((item) => item.source === "mealTickets").reduce((sum, item) => sum + item.amountBani, 0);
  const salaryLeft = (salary?.amountBani ?? 0) - spentSalary, ticketsLeft = (mealTickets?.amountBani ?? 0) - spentTickets;
  return { records, salary, mealTickets, spentSalary, spentTickets, salaryLeft, ticketsLeft, totalLeft: salaryLeft + ticketsLeft, totalSpent: spentSalary + spentTickets };
}
export function categorySpending(records: ExpenseBook["records"]) {
  const groups = new Map<string, { id: string; name: string; color: string; amountBani: number }>();
  for (const item of records) {
    const group = groups.get(item.categoryId) ?? { id: item.categoryId, name: item.categoryName, color: item.categoryColor, amountBani: 0 };
    group.amountBani += item.amountBani; groups.set(item.categoryId, group);
  }
  return [...groups.values()].sort((a, b) => b.amountBani - a.amountBani || a.name.localeCompare(b.name));
}
