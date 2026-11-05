import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TrackerDialog } from "./AddEntryModal";
import { Button } from "./Button";
import { ColorPalette } from "./ColorPalette";
import { DatePicker } from "./DatePicker";
import { Dropdown } from "./Dropdown";
import { TextBox } from "./TextBox";
import { CATEGORY_COLORS, formatLei, incomeForMonth, nextExpenseMonth, parseLei } from "../Resources/expenseLedger";
import { getLocalDateKey } from "../Resources/trackerStorage";
import { COLORS } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";
import type { ExpenseAction, ExpenseBook, ExpenseSource, TrackerEntry } from "../Resources/types";

export type ExpenseEditorMode = "category" | "expense" | "assign" | "unassign" | "removeCategory" | "record" | "income" | "removeRecord";
type Props = { mode: ExpenseEditorMode; entries: TrackerEntry[]; book: ExpenseBook; date: Date; source?: ExpenseSource;
  initialCategoryId?: string; initialExpenseId?: string; recordId?: string;
  onSave: (action: ExpenseAction) => Promise<void>; onClose: () => void };

// All financial actions reuse the existing bounded modal and shared custom form controls.
export function ExpenseEditorModal({ mode, entries, book, date, source = "salary", initialCategoryId, initialExpenseId, recordId, onSave, onClose }: Props) {
  const today = getLocalDateKey(new Date()), month = today.slice(0, 7);
  const nextMonth = nextExpenseMonth(month);
  const hasIncome = book.incomes.some((item) => item.source === source);
  const income = incomeForMonth(book, source, nextMonth);
  const [name, setName] = useState("");
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [expenseId, setExpenseId] = useState(initialExpenseId);
  const [paymentDate, setPaymentDate] = useState(date);
  const [amount, setAmount] = useState(mode === "income" && income ? (income.amountBani / 100).toFixed(2) : "");
  const [paymentSource, setPaymentSource] = useState<ExpenseSource>(source);
  const [payDay, setPayDay] = useState(String(income?.payDay ?? 1));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const categories = book.categories.filter((item) => item.active);
  const available = entries.filter((item) => mode === "assign" ? item.expenseCategoryId == null : mode === "unassign" || mode === "record"
    ? item.expenseCategoryId != null && categories.some((group) => group.id === item.expenseCategoryId) : true);
  const titles: Record<ExpenseEditorMode, string> = { category: "Add a category", expense: "Add an expense", assign: "Add an expense to a category", unassign: "Remove an expense from its category",
    removeCategory: "Remove a category", record: "Record a payment", income: source === "salary" ? "Set salary" : "Set meal tickets", removeRecord: "Remove a payment" };
  const removing = ["unassign", "removeCategory", "removeRecord"].includes(mode);
  const close = () => { if (!pending.current) onClose(); };
  const save = async () => {
    if (pending.current) return;
    pending.current = true; setSaving(true); setError(""); setSuccess("");
    try {
      let action: ExpenseAction;
      if (mode === "category") action = { type: "createCategory", name, color };
      else if (mode === "expense") action = { type: "createExpense", name, categoryId: categoryId ?? "" };
      else if (mode === "assign") action = { type: "assign", expenseId: expenseId ?? "", categoryId: categoryId ?? "" };
      else if (mode === "unassign") action = { type: "unassign", expenseId: expenseId ?? "" };
      else if (mode === "removeCategory") action = { type: "removeCategory", categoryId: categoryId ?? "" };
      else if (mode === "removeRecord") action = { type: "removeRecord", recordId: recordId ?? "" };
      else if (mode === "income") action = { type: "income", source, amountBani: parseLei(amount), payDay: Number(payDay) };
      else action = { type: "record", expenseId: expenseId ?? "", date: getLocalDateKey(paymentDate), amountBani: parseLei(amount), source: paymentSource, note };
      await onSave(action);
      if (removing) { onClose(); return; }
      if (mode === "category" || mode === "expense") { setSuccess(`Added ${mode}: ${name.trim()}.`); setName(""); }
      else if (mode === "record") { setSuccess(`Recorded ${formatLei(parseLei(amount))}.`); setAmount(""); setNote(""); }
      else if (mode === "income") setSuccess(`${source === "salary" ? "Salary" : "Meal tickets"} saved from ${hasIncome ? nextMonth : month}.`);
      else setSuccess("Expense added to the category.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save this change. Please try again."); }
    finally { pending.current = false; setSaving(false); }
  };
  const selectedRecord = book.records.find((item) => item.id === recordId);
  return <TrackerDialog title={titles[mode]} onClose={close} closeLabel="Close expense dialog"
    description={removing ? mode === "removeRecord" ? "This removes the payment and restores its amount to the month's remaining balance." : "Past payments keep their original category and remain in your history."
      : mode === "income" ? `Monthly amount in lei. ${hasIncome ? `Changes start on 01/${nextMonth.slice(5)}/${nextMonth.slice(0, 4)}.` : "Your first amount applies this month."}` : undefined}
    footer={<View style={styles.actions}>
      <Button disabled={saving} icon="close" label="Close" onPress={close} variant="secondary" />
      <Button disabled={saving} icon={removing ? "removeHabit" : "save"} label={saving ? "Saving…" : removing ? "Remove" : "Save"} onPress={() => { void save(); }} />
    </View>}>
    {mode === "category" || mode === "expense" ? <TextBox label={mode === "category" ? "Category name" : "Expense name"} value={name} onChangeText={(value) => { setName(value); setSuccess(""); }} placeholder={mode === "category" ? "Entertainment" : "Concert ticket"} /> : null}
    {mode === "category" ? <ColorPalette value={color} onChange={setColor} disabled={saving} /> : null}
    {["expense", "assign", "removeCategory"].includes(mode) ? <>
      <Dropdown label="Category" placeholder="Choose a category" value={categoryId} onChange={setCategoryId} options={categories.map((item) => ({ label: item.name, value: item.id }))} />
      {!categories.length ? <Text style={styles.note}>Create a category first using Options.</Text> : null}
    </> : null}
    {["assign", "unassign", "record"].includes(mode) ? <>
      <Dropdown label="Expense" placeholder="Choose an expense" value={expenseId} onChange={setExpenseId} options={available.map((item) => ({
        label: `${item.name}${item.expenseCategoryId ? ` · ${categories.find((group) => group.id === item.expenseCategoryId)?.name ?? ""}` : ""}`, value: item.id,
      }))} />
      {!available.length ? <Text style={styles.note}>{mode === "assign" ? "All saved expenses already belong to a category. Remove an assignment first to move one." : "Add an expense to a category first."}</Text> : null}
    </> : null}
    {mode === "record" ? <>
      <DatePicker inlineCalendar label="Payment date" value={paymentDate} onChange={setPaymentDate} />
      <TextBox label="Amount (lei)" value={amount} onChangeText={(value) => { setAmount(value); setSuccess(""); }} placeholder="125,50" />
      <Dropdown label="Pay from" options={[{ label: "Salary", value: "salary" }, { label: "Meal tickets", value: "mealTickets" }]} value={paymentSource} onChange={(value) => setPaymentSource(value as ExpenseSource)} />
      <TextBox label="Note (optional)" value={note} onChangeText={setNote} />
    </> : null}
    {mode === "income" ? <>
      <TextBox label={source === "salary" ? "Monthly salary (lei)" : "Monthly meal tickets (lei)"} value={amount} onChangeText={(value) => { setAmount(value); setSuccess(""); }} placeholder="0,00" />
      <Dropdown label={source === "salary" ? "Payday (day of month)" : "Receipt day (day of month)"} options={Array.from({ length: 31 }, (_, index) => ({ label: String(index + 1).padStart(2, "0"), value: String(index + 1) }))} value={payDay} onChange={setPayDay} />
      <Text style={styles.note}>The amount repeats each month. Short months use their last day when needed. Remaining balances use this month's income and payments.</Text>
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
