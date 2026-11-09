import type { ExpenseAction, ExpenseBook, IncomeSource, TrackerEntry, TrackerSnapshot } from "./types";

export const CATEGORY_COLORS = ["#008897", "#078665", "#38242E", "#526EAD", "#885BA6", "#C36572", "#C2733E", "#AF8D31", "#477B62", "#487D91", "#8D684F", "#657180"];
const MAX_BANI = 1_000_000_000_000;
// Savings funds payments, but cannot accidentally become a repeating income setting.
export const PAYMENT_SOURCES = [{ label: "Salary", value: "salary" }, { label: "Meal tickets", value: "mealTickets" }, { label: "Savings", value: "savings" }];
export const expenseSourceLabel = (source: string) => PAYMENT_SOURCES.find((item) => item.value === source)?.label ?? source;
const sources = PAYMENT_SOURCES.map((item) => item.value);
const incomeSources = ["salary", "mealTickets"];
const normalized = (name: string) => name.trim().toLocaleLowerCase("en");
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const emptyExpenseBook = (): ExpenseBook => ({ categories: [], records: [], incomes: [], extraIncomes: [], savingsAdjustments: [], loans: [], loanRepayments: [] });

// Expose the fixed category immediately; persist it only when the first monthly item is saved.
export const isMonthlyCategory = (category: { name: string }) => normalized(category.name) === "monthly expenses";
export function expenseCategories(book: ExpenseBook) {
  const active = book.categories.filter((item) => item.active);
  if (active.some(isMonthlyCategory)) return active;
  let categoryId = "system:monthly-expenses", index = 0;
  while (book.categories.some((item) => item.id === categoryId)) categoryId = `system:monthly-expenses:${++index}`;
  return [{ id: categoryId, name: "Monthly expenses", color: CATEGORY_COLORS[0], active: true }, ...active];
}
export function parseMonthlyExpense(value: unknown): NonNullable<TrackerEntry["monthlyExpense"]> | null {
  if (value === null) return null;
  const item = value as NonNullable<TrackerEntry["monthlyExpense"]>;
  if (!item || typeof item !== "object" || !Number.isSafeInteger(item.amountBani) || item.amountBani <= 0 || item.amountBani > MAX_BANI || !sources.includes(item.source)) {
    throw new Error("Enter a monthly amount greater than zero and choose a payment source.");
  }
  return { amountBani: item.amountBani, source: item.source };
}

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
  const fail = (): never => { throw new Error("The data contains invalid expenses, income, savings, or loans."); };
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
  // Names may repeat within or across categories; stable IDs keep each payment distinct.
  for (const entry of entries) if (entry.expenseCategoryId != null) {
    if (entry.type !== "expenseType" || !categoryMap.get(entry.expenseCategoryId)?.active) return fail();
  }
  for (const entry of entries) if (entry.monthlyExpense != null) {
    if (entry.type !== "expenseType" || !isMonthlyCategory(categoryMap.get(entry.expenseCategoryId ?? "") ?? { name: "" })) return fail();
    parseMonthlyExpense(entry.monthlyExpense);
  }
  ids.clear();
  const monthlyPayments = new Set<string>();
  const records = book.records.map((record) => {
    if (!record || !text(record.id) || ids.has(record.id) || entryMap.get(record.expenseId)?.type !== "expenseType" || !categoryMap.has(record.categoryId) ||
        !text(record.expenseName) || !text(record.categoryName) || !/^#[0-9a-f]{6}$/i.test(record.categoryColor) || !validExpenseDate(record.date) ||
        !money(record.amountBani) || record.amountBani === 0 || !sources.includes(record.source) || typeof record.note !== "string" ||
        (record.monthly !== undefined && record.monthly !== true)) return fail();
    if (record.monthly) {
      const key = `${record.expenseId}:${record.date.slice(0, 7)}`;
      if (monthlyPayments.has(key) || !isMonthlyCategory(categoryMap.get(record.categoryId)!)) return fail();
      monthlyPayments.add(key);
    }
    ids.add(record.id);
    return { id: record.id, expenseId: record.expenseId, expenseName: record.expenseName, categoryId: record.categoryId,
      categoryName: record.categoryName, categoryColor: record.categoryColor, date: record.date, amountBani: record.amountBani, source: record.source, note: record.note,
      ...(record.monthly ? { monthly: true as const } : {}) };
  });
  ids.clear(); const periods = new Set<string>();
  const incomes = book.incomes.map((income) => {
    const period = `${income?.source}:${income?.effectiveMonth}`;
    if (!income || !text(income.id) || ids.has(income.id) || !incomeSources.includes(income.source) || !validExpenseDate(`${income.effectiveMonth}-01`) ||
        periods.has(period) || !money(income.amountBani) || !Number.isInteger(income.payDay) || income.payDay < 1 || income.payDay > 31) return fail();
    ids.add(income.id); periods.add(period);
    return { id: income.id, source: income.source, effectiveMonth: income.effectiveMonth, amountBani: income.amountBani, payDay: income.payDay };
  });
  // Missing arrays migrate older local snapshots; malformed new data must never be silently discarded.
  const movements = (value: unknown, signed = false) => {
    if (value === undefined) return [];
    if (!Array.isArray(value)) return fail();
    const seen = new Set<string>();
    return value.map((item) => {
      if (!item || !text(item.id) || seen.has(item.id) || !validExpenseDate(item.date) ||
          (signed ? !Number.isSafeInteger(item.amountBani) : !money(item.amountBani)) || item.amountBani === 0) return fail();
      seen.add(item.id);
      return { id: item.id as string, date: item.date as string, amountBani: item.amountBani as number };
    });
  };
  const extraIncomes = movements(book.extraIncomes);
  const savingsAdjustments = movements(book.savingsAdjustments, true);
  const loanAmounts = movements(book.loans);
  const loans = loanAmounts.map((item, index) => {
    const loan = book.loans[index];
    if (!text(loan.name)) return fail();
    return { ...item, name: loan.name };
  });
  const loanMap = new Map(loans.map((item) => [item.id, item]));
  const repaymentAmounts = movements(book.loanRepayments);
  const repaid = new Map<string, number>();
  const loanRepayments = repaymentAmounts.map((item, index) => {
    const loanId = book.loanRepayments[index].loanId, loan = loanMap.get(loanId);
    if (!loan || item.date < loan.date) return fail();
    const amount = (repaid.get(loanId) ?? 0) + item.amountBani;
    if (!Number.isSafeInteger(amount) || amount > loan.amountBani) return fail();
    repaid.set(loanId, amount);
    return { ...item, loanId };
  });
  const allAmounts = [...records, ...incomes, ...extraIncomes, ...savingsAdjustments, ...loans, ...loanRepayments];
  if (!Number.isSafeInteger(allAmounts.reduce((total, item) => total + Math.abs(item.amountBani), 0))) return fail();
  return { categories, records, incomes, extraIncomes, savingsAdjustments, loans, loanRepayments };
}

// Save expenses and their payment snapshots together without rewriting earlier months.
export function applyExpenseAction(current: TrackerSnapshot, action: ExpenseAction, today: string): TrackerSnapshot {
  let entries = current.entries;
  let book = current.expenses;
  // Share date/amount validation across the new one-off income, balance, and debt actions.
  const amount = (value: number, allowZero = false) => {
    if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1) || value > MAX_BANI) throw new Error(`Enter an amount ${allowZero ? "of zero or more" : "greater than zero"}.`);
  };
  const dated = (date: string) => {
    if (!validExpenseDate(date) || date > today) throw new Error("Choose today or an earlier date.");
  };
  const category = (categoryId: string) => {
    const item = expenseCategories(book).find((item) => item.id === categoryId);
    if (!item) throw new Error("Choose an available category.");
    if (!book.categories.some((item) => item.id === categoryId)) book = { ...book, categories: [...book.categories, item] };
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
    if (isMonthlyCategory(category(action.categoryId))) throw new Error("Monthly expenses is a fixed category. Remove individual expenses from it instead.");
    book = { ...book, categories: book.categories.map((item) => item.id === action.categoryId ? { ...item, active: false } : item) };
    entries = entries.map((item) => item.expenseCategoryId === action.categoryId ? { ...item, expenseCategoryId: null } : item);
  } else if (action.type === "createPayment") {
    // Regular category additions are already paid; create both records atomically.
    const group = category(action.categoryId), name = action.name.trim();
    if (isMonthlyCategory(group)) throw new Error("Add a fixed monthly expense and use its checkbox to pay it.");
    if (!name) throw new Error("Enter an expense name.");
    if (!validExpenseDate(action.date) || action.date > today) throw new Error("Choose today or an earlier date for a paid expense.");
    if (!Number.isSafeInteger(action.amountBani) || action.amountBani <= 0 || action.amountBani > MAX_BANI || !sources.includes(action.source)) throw new Error("Choose a payment source and an amount greater than zero.");
    const expenseId = id();
    entries = [...entries, { id: expenseId, name, type: "expenseType", expenseCategoryId: group.id }];
    book = { ...book, records: [...book.records, { id: id(), expenseId, expenseName: name, categoryId: group.id, categoryName: group.name,
      categoryColor: group.color, date: action.date, amountBani: action.amountBani, source: action.source, note: "" }] };
  } else if (action.type === "createExpense") {
    const group = category(action.categoryId);
    const monthly = isMonthlyCategory(group) ? parseMonthlyExpense(action.monthly) : null;
    const name = action.name.trim();
    if (!name) throw new Error("Enter an expense name.");
    // Reuse an unassigned saved name when possible without imposing name ownership.
    const matching = entries.find((item) => item.type === "expenseType" && item.expenseCategoryId == null && normalized(item.name) === normalized(name));
    entries = matching ? entries.map((item) => item.id === matching.id ? { ...item, expenseCategoryId: action.categoryId, monthlyExpense: monthly } : item)
      : [...entries, { id: id(), name, type: "expenseType", expenseCategoryId: action.categoryId, monthlyExpense: monthly }];
  } else if (action.type === "assign") {
    const group = category(action.categoryId); const item = expense(action.expenseId);
    // Legacy assignment still moves an individual ID, while equal names remain independent.
    if (item.expenseCategoryId != null) {
      throw new Error("Remove this expense from its current category first.");
    }
    const monthly = isMonthlyCategory(group) ? parseMonthlyExpense(action.monthly) : null;
    entries = entries.map((item) => item.id === action.expenseId ? { ...item, expenseCategoryId: action.categoryId, monthlyExpense: monthly } : item);
  } else if (action.type === "unassign") {
    expense(action.expenseId);
    entries = entries.map((item) => item.id === action.expenseId ? { ...item, expenseCategoryId: null, monthlyExpense: null } : item);
  } else if (action.type === "setMonthly") {
    const item = expense(action.expenseId);
    if (!isMonthlyCategory(category(item.expenseCategoryId ?? ""))) throw new Error("Choose an expense in Monthly expenses.");
    const monthlyExpense = parseMonthlyExpense({ amountBani: action.amountBani, source: action.source });
    entries = entries.map((entry) => entry.id === item.id ? { ...entry, monthlyExpense } : entry);
  } else if (action.type === "toggleMonthly") {
    const item = expense(action.expenseId), group = category(item.expenseCategoryId ?? "");
    if (!isMonthlyCategory(group) || !validExpenseDate(action.date) || action.date > today) throw new Error("Choose a non-future date for a monthly payment.");
    const month = action.date.slice(0, 7);
    const paid = book.records.find((record) => record.monthly && record.expenseId === item.id && record.date.startsWith(month));
    if (paid) book = { ...book, records: book.records.filter((record) => record.id !== paid.id) };
    else {
      const fixed = parseMonthlyExpense(item.monthlyExpense)!;
      if (!fixed) throw new Error("Set this expense's monthly amount and payment source first.");
      // Checking creates exactly one ordinary payment; nothing is deducted by a month change alone.
      book = { ...book, records: [...book.records, { id: id(), expenseId: item.id, expenseName: item.name, categoryId: group.id, categoryName: group.name,
        categoryColor: group.color, date: action.date, amountBani: fixed.amountBani, source: fixed.source, note: "", monthly: true }] };
    }
  } else if (action.type === "record") {
    const item = expense(action.expenseId), group = category(item.expenseCategoryId ?? "");
    if (isMonthlyCategory(group)) throw new Error("Use the checkbox in Monthly expenses to pay its saved amount.");
    if (!validExpenseDate(action.date) || action.date > today) throw new Error("Choose today or an earlier date for a paid expense.");
    if (!Number.isSafeInteger(action.amountBani) || action.amountBani <= 0 || action.amountBani > MAX_BANI || !sources.includes(action.source)) throw new Error("Choose a payment source and an amount greater than zero.");
    book = { ...book, records: [...book.records, { id: id(), expenseId: item.id, expenseName: item.name, categoryId: group.id, categoryName: group.name,
      categoryColor: group.color, date: action.date, amountBani: action.amountBani, source: action.source, note: action.note.trim() }] };
  } else if (action.type === "removeRecord") {
    if (!book.records.some((item) => item.id === action.recordId)) throw new Error("This payment is no longer available.");
    book = { ...book, records: book.records.filter((item) => item.id !== action.recordId) };
  } else if (action.type === "income") {
    if (!incomeSources.includes(action.source) || !Number.isSafeInteger(action.amountBani) || action.amountBani < 0 || action.amountBani > MAX_BANI || !Number.isInteger(action.payDay) || action.payDay < 1 || action.payDay > 31) throw new Error("Enter a valid monthly amount and receipt day.");
    const month = today.slice(0, 7);
    const effectiveMonth = book.incomes.some((item) => item.source === action.source) ? nextExpenseMonth(month) : month;
    const existing = book.incomes.find((item) => item.source === action.source && item.effectiveMonth === effectiveMonth);
    book = { ...book, incomes: [...book.incomes.filter((item) => item.source !== action.source || item.effectiveMonth !== effectiveMonth),
      { id: existing?.id ?? id(), source: action.source, effectiveMonth, amountBani: action.amountBani, payDay: action.payDay }] };
  } else if (action.type === "extraIncome") {
    amount(action.amountBani); dated(action.date);
    book = { ...book, extraIncomes: [...(book.extraIncomes ?? []), { id: id(), date: action.date, amountBani: action.amountBani }] };
  } else if (action.type === "setSavings") {
    // Store only today's adjustment so setting a balance never rewrites past spending or months.
    amount(action.amountBani, true);
    const difference = action.amountBani - savingsBalance(book, today);
    if (difference) book = { ...book, savingsAdjustments: [...(book.savingsAdjustments ?? []), { id: id(), date: today, amountBani: difference }] };
  } else if (action.type === "createLoan") {
    amount(action.amountBani); dated(action.date);
    if (!action.name.trim()) throw new Error("Enter a loan name.");
    book = { ...book, loans: [...(book.loans ?? []), { id: id(), name: action.name.trim(), date: action.date, amountBani: action.amountBani }] };
  } else if (action.type === "repayLoan") {
    // Repayments reduce debt only: no expense record or account deduction is created.
    amount(action.amountBani); dated(action.date);
    const loan = (book.loans ?? []).find((item) => item.id === action.loanId);
    if (!loan) throw new Error("This loan is no longer available.");
    const remaining = loanRemaining(book, loan.id, "9999-12-31");
    if (action.date < loan.date) throw new Error("Choose a repayment date on or after the loan date.");
    if (action.amountBani > remaining) throw new Error(`Only ${formatLei(remaining)} remains on this loan.`);
    book = { ...book, loanRepayments: [...(book.loanRepayments ?? []), { id: id(), loanId: loan.id, date: action.date, amountBani: action.amountBani }] };
  }
  // Financial changes preserve shopping and inventory stored in the same atomic snapshot.
  return { ...current, entries, expenses: parseExpenseBook(book, entries) };
}

// Monthly budgets reset to the applicable income amount; unspent balances are not added as new income.
export function incomeForMonth(book: ExpenseBook, source: IncomeSource, month: string) {
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
  // Savings spending is still an expense, but neither its balance nor its spending changes Total left.
  const spentSavings = records.filter((item) => item.source === "savings").reduce((sum, item) => sum + item.amountBani, 0);
  const extraIncome = (book.extraIncomes ?? []).filter((item) => item.date.startsWith(month) && item.date <= today).reduce((sum, item) => sum + item.amountBani, 0);
  const end = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0, 12);
  const cutoff = `${month}-${String(end.getDate()).padStart(2, "0")}`;
  const asOf = cutoff < today ? cutoff : today;
  return { records, salary, mealTickets, spentSalary, spentTickets, spentSavings, salaryLeft, ticketsLeft, extraIncome,
    savings: savingsBalance(book, asOf), asOf, totalLeft: salaryLeft + ticketsLeft + extraIncome, totalSpent: spentSalary + spentTickets + spentSavings };
}
// Both balances are date-aware so navigating older months preserves their original account/debt history.
export function savingsBalance(book: ExpenseBook, date: string): number {
  return (book.savingsAdjustments ?? []).filter((item) => item.date <= date).reduce((sum, item) => sum + item.amountBani, 0)
    - book.records.filter((item) => item.source === "savings" && item.date <= date).reduce((sum, item) => sum + item.amountBani, 0);
}
export function loanRemaining(book: ExpenseBook, loanId: string, date: string): number {
  const loan = (book.loans ?? []).find((item) => item.id === loanId && item.date <= date);
  return loan ? loan.amountBani - (book.loanRepayments ?? []).filter((item) => item.loanId === loanId && item.date <= date).reduce((sum, item) => sum + item.amountBani, 0) : 0;
}
export function categorySpending(records: ExpenseBook["records"]) {
  const groups = new Map<string, { id: string; name: string; color: string; amountBani: number }>();
  for (const item of records) {
    const group = groups.get(item.categoryId) ?? { id: item.categoryId, name: item.categoryName, color: item.categoryColor, amountBani: 0 };
    group.amountBani += item.amountBani; groups.set(item.categoryId, group);
  }
  return [...groups.values()].sort((a, b) => b.amountBani - a.amountBani || a.name.localeCompare(b.name));
}
