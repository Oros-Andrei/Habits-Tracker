import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TrackerDialog } from "./AddEntryModal";
import { Button } from "./Button";
import { ColorPalette } from "./ColorPalette";
import { DatePicker } from "./DatePicker";
import { Dropdown } from "./Dropdown";
import { TextBox } from "./TextBox";
import { CATEGORY_COLORS, PAYMENT_SOURCES, expenseCategories, expenseSourceLabel, formatLei, incomeForMonth, isMonthlyCategory, loanRemaining, nextExpenseMonth, parseLei, savingsBalance } from "../Resources/expenseLedger";
import { getLocalDateKey } from "../Resources/trackerStorage";
import { COLORS } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";
import type { ExpenseAction, ExpenseBook, ExpenseSource, IncomeSource, TrackerEntry } from "../Resources/types";

// Regular expenses are paid on creation; only recurring items need list membership controls.
// New money and debt forms retain the same guarded saving and closeable shared dialog.
export type ExpenseEditorMode = "category" | "expense" | "unassign" | "removeCategory" | "income" | "removeRecord" | "monthly" | "extraIncome" | "savings" | "loan" | "repayLoan";
type Props = { mode: ExpenseEditorMode; entries: TrackerEntry[]; book: ExpenseBook; date: Date; source?: IncomeSource;
  initialCategoryId?: string; initialExpenseId?: string; recordId?: string; loanId?: string;
  onSave: (action: ExpenseAction) => Promise<void>; onClose: () => void };

// All financial actions reuse the existing bounded modal and shared custom form controls.
export function ExpenseEditorModal({ mode, entries, book, date, source = "salary", initialCategoryId, initialExpenseId, recordId, loanId, onSave, onClose }: Props) {
  const today = getLocalDateKey(new Date()), month = today.slice(0, 7);
  const nextMonth = nextExpenseMonth(month);
  const hasIncome = book.incomes.some((item) => item.source === source);
  const income = incomeForMonth(book, source, nextMonth);
  const initialMonthly = entries.find((item) => item.id === initialExpenseId)?.monthlyExpense;
  const [name, setName] = useState("");
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [expenseId, setExpenseId] = useState(initialExpenseId);
  const [paymentDate, setPaymentDate] = useState(date);
  // Savings edits start with the live balance, even while the page is viewing a historical month.
  const [amount, setAmount] = useState(mode === "savings" ? (savingsBalance(book, today) / 100).toFixed(2) : mode === "income" && income ? (income.amountBani / 100).toFixed(2) : mode === "monthly" && initialMonthly ? (initialMonthly.amountBani / 100).toFixed(2) : "");
  const [paymentSource, setPaymentSource] = useState<ExpenseSource>(mode === "monthly" && initialMonthly ? initialMonthly.source : source);
  const [payDay, setPayDay] = useState(String(income?.payDay ?? 1));
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const categories = expenseCategories(book).filter((item) => mode !== "removeCategory" || !isMonthlyCategory(item));
  const monthlyForm = mode === "monthly" || (mode === "expense" && categories.some((item) => item.id === categoryId && isMonthlyCategory(item)));
  const available = entries.filter((item) => categories.some((group) => group.id === item.expenseCategoryId && isMonthlyCategory(group)));
  const selectedLoan = (book.loans ?? []).find((item) => item.id === loanId);
  const remaining = selectedLoan ? loanRemaining(book, selectedLoan.id, today) : 0;
  const moneyForm = ["extraIncome", "savings", "loan", "repayLoan"].includes(mode);
  const titles: Record<ExpenseEditorMode, string> = { category: "Add a category", expense: "Add an expense", unassign: "Remove a monthly expense",
    removeCategory: "Remove a category", income: source === "salary" ? "Set salary" : "Set meal tickets", removeRecord: "Remove a payment", monthly: "Set monthly expense",
    extraIncome: "Add extra income", savings: "Set savings balance", loan: "Add a loan", repayLoan: "Record a loan payment" };
  const removing = ["unassign", "removeCategory", "removeRecord"].includes(mode);
  const close = () => { if (!pending.current) onClose(); };
  const save = async () => {
    if (pending.current) return;
    pending.current = true; setSaving(true); setError(""); setSuccess("");
    try {
      let action: ExpenseAction;
      const monthly = monthlyForm ? { amountBani: parseLei(amount), source: paymentSource } : undefined;
      if (mode === "category") action = { type: "createCategory", name, color };
      // One Save records regular spending; monthly additions stay unpaid until checked.
      else if (mode === "expense") action = monthly
        ? { type: "createExpense", name, categoryId: categoryId ?? "", monthly }
        : { type: "createPayment", name, categoryId: categoryId ?? "", date: getLocalDateKey(paymentDate), amountBani: parseLei(amount), source: paymentSource };
      else if (mode === "monthly") action = { type: "setMonthly", expenseId: expenseId ?? "", amountBani: monthly!.amountBani, source: monthly!.source };
      else if (mode === "unassign") action = { type: "unassign", expenseId: expenseId ?? "" };
      else if (mode === "removeCategory") action = { type: "removeCategory", categoryId: categoryId ?? "" };
      else if (mode === "removeRecord") action = { type: "removeRecord", recordId: recordId ?? "" };
      // Loan payments change only the outstanding debt; Savings is adjusted to the entered balance.
      else if (mode === "extraIncome") action = { type: "extraIncome", date: getLocalDateKey(paymentDate), amountBani: parseLei(amount) };
      else if (mode === "savings") action = { type: "setSavings", amountBani: parseLei(amount) };
      else if (mode === "loan") action = { type: "createLoan", name, date: getLocalDateKey(paymentDate), amountBani: parseLei(amount) };
      else if (mode === "repayLoan") action = { type: "repayLoan", loanId: loanId ?? "", date: getLocalDateKey(paymentDate), amountBani: parseLei(amount) };
      else action = { type: "income", source, amountBani: parseLei(amount), payDay: Number(payDay) };
      await onSave(action);
      if (removing) { onClose(); return; }
      if (mode === "category" || mode === "expense") {
        setSuccess(mode === "expense" && !monthlyForm ? `Added expense: ${name.trim()}. ${formatLei(parseLei(amount))} deducted from ${expenseSourceLabel(paymentSource)}.` : `Added ${mode}: ${name.trim()}.`);
        setName(""); if (mode === "expense") setAmount("");
      }
      else if (mode === "income") setSuccess(`${source === "salary" ? "Salary" : "Meal tickets"} saved from ${hasIncome ? nextMonth : month}.`);
      else if (mode === "monthly") setSuccess("Monthly amount and payment source saved.");
      else if (moneyForm) {
        setSuccess(mode === "savings" ? `Savings balance set to ${formatLei(parseLei(amount))}.` : mode === "extraIncome" ? `${formatLei(parseLei(amount))} added to Total left for ${getLocalDateKey(paymentDate).slice(0, 7)}.`
          : mode === "loan" ? `Loan added: ${name.trim()}.` : `${formatLei(parseLei(amount))} paid towards ${selectedLoan?.name}.`);
        if (mode !== "savings") setAmount("");
        if (mode === "loan") setName("");
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save this change. Please try again."); }
    finally { pending.current = false; setSaving(false); }
  };
  const selectedRecord = book.records.find((item) => item.id === recordId);
  const categoryChosen = categories.some((item) => item.id === categoryId);
  const expenseChosen = available.some((item) => item.id === expenseId);
  const canSave = mode === "category" ? !!name.trim() : mode === "expense" ? !!name.trim() && categoryChosen && !!amount.trim()
    : mode === "loan" ? !!name.trim() && !!amount.trim() : mode === "repayLoan" ? !!selectedLoan && remaining > 0 && !!amount.trim()
    : mode === "unassign" ? expenseChosen
    : mode === "removeCategory" ? categoryChosen : mode === "removeRecord" ? !!selectedRecord
    : !!amount.trim();
  return <TrackerDialog title={titles[mode]} onClose={close} closeLabel="Close expense dialog"
    description={removing ? mode === "removeRecord" ? "This removes the payment and restores its amount to the month's remaining balance." : "Past payments keep their original category and remain in your history."
      : mode === "income" ? `Monthly amount in lei. ${hasIncome ? `Changes start on 01/${nextMonth.slice(5)}/${nextMonth.slice(0, 4)}.` : "Your first amount applies this month."}`
      : mode === "extraIncome" ? "Money received from family, gifts, or other sources. Added only to that month's Total left."
      : mode === "savings" ? "Set your current balance. Savings carries across months and is separate from Total left."
      : mode === "loan" || mode === "repayLoan" ? "Track what you owe. Loan payments do not affect your balances or spending." : undefined}
    footer={<View style={styles.actions}>
      <Button disabled={saving} icon="close" label="Close" onPress={close} variant="secondary" />
      <Button disabled={saving || !canSave || (monthlyForm && !amount.trim())} icon={removing ? "removeHabit" : "save"} label={saving ? "Saving…" : removing ? "Remove" : "Save"} onPress={() => { void save(); }} />
    </View>}>
    {/* Choose the category before naming and pricing the expense. */}
    {["expense", "removeCategory"].includes(mode) ? <>
      <Dropdown disabled={saving} label="Category" placeholder="Choose a category" value={categoryId} onChange={setCategoryId} options={categories.map((item) => ({ label: item.name, value: item.id }))} />
      {!categories.length ? <Text style={styles.note}>Create a category first using Options.</Text> : null}
    </> : null}
    {mode === "category" || mode === "expense" ? <TextBox disabled={saving} label={mode === "category" ? "Category name" : "Expense name"} value={name} onChangeText={(value) => { setName(value); setSuccess(""); }} placeholder={mode === "category" ? "Entertainment" : "Concert ticket"} /> : null}
    {mode === "category" ? <ColorPalette value={color} onChange={setColor} disabled={saving} /> : null}
    {monthlyForm || mode === "expense" ? <>
      {/* Show the funding source beside the amount for both recurring and immediate payments. */}
      {mode === "monthly" ? <Text style={styles.note}>{entries.find((item) => item.id === expenseId)?.name}</Text> : null}
      <TextBox disabled={saving} label={monthlyForm ? "Monthly amount (lei)" : "Amount (lei)"} value={amount} onChangeText={(value) => { setAmount(value); setSuccess(""); }} placeholder="50,00" />
      <Dropdown disabled={saving} label={monthlyForm ? "Deduct from" : "Paid from"} options={PAYMENT_SOURCES}
        value={paymentSource} onChange={(value) => setPaymentSource(value as ExpenseSource)} />
      {monthlyForm ? <Text style={styles.note}>The amount repeats each month. Money is deducted only when you check the expense as paid.</Text>
        : <DatePicker inlineCalendar label="Payment date" value={paymentDate} onChange={setPaymentDate} />}
    </> : null}
    {mode === "unassign" ? <>
      <Dropdown disabled={saving} label="Expense" placeholder="Choose an expense" value={expenseId} onChange={setExpenseId} options={available.map((item) => ({
        label: `${item.name}${item.expenseCategoryId ? ` · ${categories.find((group) => group.id === item.expenseCategoryId)?.name ?? ""}` : ""}`, value: item.id,
      }))} />
      {!available.length ? <Text style={styles.note}>No monthly expenses to remove.</Text> : null}
    </> : null}
    {mode === "income" ? <>
      <TextBox disabled={saving} label={source === "salary" ? "Monthly salary (lei)" : "Monthly meal tickets (lei)"} value={amount} onChangeText={(value) => { setAmount(value); setSuccess(""); }} placeholder="0,00" />
      <Dropdown disabled={saving} label={source === "salary" ? "Payday (day of month)" : "Receipt day (day of month)"} options={Array.from({ length: 31 }, (_, index) => ({ label: String(index + 1).padStart(2, "0"), value: String(index + 1) }))} value={payDay} onChange={setPayDay} />
      <Text style={styles.note}>The amount repeats each month. Short months use their last day when needed. Remaining balances use this month's income and payments.</Text>
    </> : null}
    {/* Keep debt rows simple while collecting dated amounts inside the shared dialog. */}
    {moneyForm ? <>
      {mode === "loan" ? <TextBox disabled={saving} label="Loan name" value={name} onChangeText={(value) => { setName(value); setSuccess(""); }} placeholder="Laptop loan" /> : null}
      {mode === "repayLoan" ? <Text style={styles.note}>{selectedLoan ? `${selectedLoan.name} · ${formatLei(remaining)} remaining` : "This loan is no longer available."}</Text> : null}
      <TextBox disabled={saving} label={mode === "savings" ? "Current savings balance (lei)" : mode === "repayLoan" ? "Amount paid (lei)" : "Amount (lei)"}
        value={amount} onChangeText={(value) => { setAmount(value); setSuccess(""); }} placeholder="0,00" />
      {mode !== "savings" ? <DatePicker inlineCalendar label={mode === "extraIncome" ? "Received date" : mode === "loan" ? "Loan date" : "Payment date"} value={paymentDate} onChange={setPaymentDate} /> : null}
    </> : null}
    {mode === "removeRecord" && selectedRecord ? <Text style={styles.note}>{selectedRecord.expenseName} · {formatLei(selectedRecord.amountBani)} · {selectedRecord.date.split("-").reverse().join("/")}</Text> : null}
    {success ? <Text accessibilityLiveRegion="polite" style={styles.success}>{success}</Text> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </TrackerDialog>;
}
const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10, marginTop: 4 }, note: { color: COLORS.mutedText, fontFamily: FONT_FAMILY.regular, fontSize: 14 },
  success: { color: COLORS.gradientGreen, fontFamily: FONT_FAMILY.medium, fontSize: 14 }, error: { color: COLORS.gradientPlum, fontFamily: FONT_FAMILY.medium, fontSize: 14 },
});
