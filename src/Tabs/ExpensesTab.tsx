import { useCallback, useEffect, useRef, useState, type ComponentRef } from "react";
import { AppState, Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { ActionMenu } from "../Components/ActionMenu";
import { Button } from "../Components/Button";
import { Calendar } from "../Components/Calendar";
import { ExpenseEditorModal, type ExpenseEditorMode } from "../Components/ExpenseEditorModal";
import { ExpensePieChart } from "../Components/ExpensePieChart";
import { expenseMonthSummary, formatLei, incomeReceiptDate } from "../Resources/expenseLedger";
import { getLocalDateKey } from "../Resources/trackerStorage";
import { COLORS, SOFT_SHADOW } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";
import type { ExpenseAction, ExpenseBook, ExpenseRecord, ExpenseSource, TrackerEntry } from "../Resources/types";

type ExpensesTabProps = { entries: TrackerEntry[]; book: ExpenseBook; onUpdate: (action: ExpenseAction) => Promise<void> };
type Editor = { mode: ExpenseEditorMode; source?: ExpenseSource; categoryId?: string; expenseId?: string; recordId?: string };

// One selected month drives budgets, the payment list, calendar, and category pie on both platforms.
export function ExpensesTab({ entries, book, onUpdate }: ExpensesTabProps) {
  const { width, height } = useWindowDimensions();
  const columns = Platform.OS === "web" && width >= 1200;
  const [today, setToday] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [month, setMonth] = useState(() => getLocalDateKey(new Date()).slice(0, 7));
  const [menu, setMenu] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const anchor = useRef<ComponentRef<typeof View>>(null);
  const [editor, setEditor] = useState<Editor>();
  const todayKey = getLocalDateKey(today), dateKey = getLocalDateKey(selectedDate);
  const summary = expenseMonthSummary(book, month, todayKey);
  const categories = book.categories.filter((item) => item.active);
  const unassigned = entries.filter((item) => item.expenseCategoryId == null);
  const monthDate = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1, 12);
  const counts: Record<string, number> = {};
  for (const record of summary.records) counts[record.date] = (counts[record.date] ?? 0) + 1;
  const dayRecords = summary.records.filter((item) => item.date === dateKey);
  // Month navigation changes the financial period without letting a stale date select another month.
  const changeMonth = useCallback((date: Date) => {
    const key = getLocalDateKey(date).slice(0, 7);
    setMonth(key);
    setSelectedDate((current) => getLocalDateKey(current).startsWith(key) ? current : new Date(date.getFullYear(), date.getMonth(), 1, 12));
  }, []);
  const chooseDate = (date: Date) => { setMonth(getLocalDateKey(date).slice(0, 7)); setSelectedDate(date); };
  const open = (value: Editor) => { setMenu(false); setEditor(value); };
  const openOptions = () => anchor.current?.measureInWindow((x, y, _width, buttonHeight) => {
    setPosition({ left: x, top: y + buttonHeight + 8 }); setMenu(true);
  });
  useEffect(() => {
    const now = new Date(), tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(() => setToday(new Date()), tomorrow.getTime() - now.getTime() + 100);
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") setToday(new Date()); });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [todayKey]);
  const receipt = (source: ExpenseSource) => {
    const income = source === "salary" ? summary.salary : summary.mealTickets;
    return income ? `${source === "salary" ? "Payday" : "Receipt date"}: ${incomeReceiptDate(month, income.payDay).toLocaleDateString("en-GB")}` : "Not set for this month";
  };
  const cards = [
    { label: "Salary", value: summary.salary?.amountBani ?? 0, source: "salary" as ExpenseSource, note: receipt("salary") },
    { label: "Salary left", value: summary.salaryLeft, note: `${formatLei(summary.spentSalary)} spent` },
    { label: "Meal tickets", value: summary.mealTickets?.amountBani ?? 0, source: "mealTickets" as ExpenseSource, note: receipt("mealTickets") },
    { label: "Meal tickets left", value: summary.ticketsLeft, note: `${formatLei(summary.spentTickets)} spent` },
    { label: "Total left", value: summary.totalLeft, note: "Salary + meal tickets remaining" },
  ];
  const paymentRow = (record: ExpenseRecord) => <View key={record.id} style={styles.payment}>
    <View style={[styles.dot, { backgroundColor: record.categoryColor }]} />
    <View style={styles.details}>
      <Text style={styles.name}>{record.expenseName}</Text>
      <Text style={styles.note}>{record.categoryName} · {record.date.split("-").reverse().join("/")}</Text>
      <Text style={styles.note}>{record.source === "salary" ? "Salary" : "Meal tickets"}{record.note ? ` · ${record.note}` : ""}</Text>
      <Text style={styles.amount}>{formatLei(record.amountBani)}</Text>
    </View>
    <Button icon="removeHabit" iconOnly label={`Remove payment for ${record.expenseName}`} onPress={() => open({ mode: "removeRecord", recordId: record.id })} variant="secondary" />
  </View>;
  return (
    <View style={styles.page}>
      <Modal animationType="none" transparent visible={menu} onRequestClose={() => setMenu(false)}>
        <View style={styles.menuOverlay}>
          <Pressable accessibilityLabel="Close expense options" accessibilityRole="button" onPress={() => setMenu(false)} style={StyleSheet.absoluteFill} />
          <ActionMenu visible={menu} menuStyle={{ left: Math.max(12, Math.min(position.left, width - Math.min(340, width - 24) - 12)), top: Math.max(12, Math.min(position.top, height - 356)), minWidth: 0, width: Math.min(340, width - 24) }} actions={[
            { id: "category", label: "Add a category", icon: "add", onPress: () => open({ mode: "category" }) },
            { id: "expense", label: "Add an expense", icon: "expenses", onPress: () => open({ mode: "expense" }) },
            { id: "assign", label: "Add expense to category", icon: "add", onPress: () => open({ mode: "assign" }) },
            { id: "record", label: "Record a payment", icon: "save", onPress: () => open({ mode: "record" }) },
            { id: "unassign", label: "Remove expense from category", icon: "removeHabit", onPress: () => open({ mode: "unassign" }) },
            { id: "removeCategory", label: "Remove a category", icon: "removeHabit", onPress: () => open({ mode: "removeCategory" }) },
          ]} />
        </View>
      </Modal>
      {editor ? <ExpenseEditorModal mode={editor.mode} entries={entries} book={book} date={selectedDate} source={editor.source}
        initialCategoryId={editor.categoryId} initialExpenseId={editor.expenseId} recordId={editor.recordId} onSave={onUpdate} onClose={() => setEditor(undefined)} /> : null}
      <View style={styles.heading}>
        <Text style={styles.title}>{monthDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</Text>
        <View ref={anchor} collapsable={false} style={styles.optionsAnchor}><Button icon="options" iconOnly label="Expense options" onPress={openOptions} variant="secondary" /></View>
      </View>
      <View style={styles.budgetGrid}>{cards.map((card) => <View key={card.label} style={[styles.budget, SOFT_SHADOW]}>
        <View style={styles.cardHeading}><Text style={styles.cardTitle}>{card.label}</Text>
          {card.source ? <View style={styles.optionsAnchor}><Button icon="options" iconOnly label={`Set ${card.label.toLowerCase()}`} onPress={() => open({ mode: "income", source: card.source })} variant="secondary" /></View> : null}
        </View>
        <Text style={[styles.balance, card.value < 0 && styles.negative]}>{formatLei(card.value)}</Text>
        <Text style={styles.note}>{card.note}</Text>
      </View>)}</View>
      <View style={[styles.layout, columns && styles.columns]}>
        <View style={[styles.section, columns && styles.categoryColumn]}>
          <Text style={styles.title}>Categories</Text>
          {!categories.length ? <View style={[styles.panel, SOFT_SHADOW]}><Text style={styles.note}>Use Options to create a category and choose its colour.</Text></View> : null}
          {categories.map((category) => <View key={category.id} style={[styles.panel, SOFT_SHADOW]}>
            <View style={styles.cardHeading}><View style={[styles.dot, { backgroundColor: category.color }]} /><Text style={styles.subtitle}>{category.name}</Text></View>
            {entries.filter((entry) => entry.expenseCategoryId === category.id).map((entry) => <View key={entry.id} style={styles.expenseRow}>
              <Text style={[styles.name, styles.details]}>{entry.name}</Text>
              <Button icon="add" iconOnly label={`Record payment for ${entry.name}`} onPress={() => open({ mode: "record", expenseId: entry.id })} variant="secondary" />
            </View>)}
            <View style={styles.actions}><Button icon="add" label="Add expense" onPress={() => open({ mode: "expense", categoryId: category.id })} variant="secondary" /></View>
          </View>)}
          {unassigned.length ? <View style={[styles.panel, SOFT_SHADOW]}><Text style={styles.subtitle}>Unassigned expenses</Text>
            {unassigned.map((entry) => <View key={entry.id} style={styles.expenseRow}><Text style={[styles.name, styles.details]}>{entry.name}</Text>
              <Button icon="add" iconOnly label={`Assign ${entry.name}`} onPress={() => open({ mode: "assign", expenseId: entry.id })} variant="secondary" /></View>)}
          </View> : null}
        </View>
        <View style={[styles.section, columns && styles.recordsColumn]}>
          <Text style={styles.title}>Payments this month</Text>
          <View style={[styles.panel, SOFT_SHADOW]}>
            <Text style={styles.subtitle}>{formatLei(summary.totalSpent)} spent</Text>
            <View style={styles.actions}><Button icon="add" label="Record a payment" onPress={() => open({ mode: "record" })} /></View>
            {summary.records.length ? [...summary.records].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).map(paymentRow) : <Text style={styles.note}>No payments recorded this month.</Text>}
          </View>
        </View>
        <View style={[styles.section, columns && styles.chartColumn]}>
          <Text style={styles.title}>Spending by category</Text>
          <View style={[styles.panel, SOFT_SHADOW]}><ExpensePieChart records={summary.records} /></View>
          <Calendar key={month} value={selectedDate} onChange={chooseDate} onMonthChange={changeMonth} dayCounts={counts} countLabel="payments" />
          <View style={[styles.panel, SOFT_SHADOW]}>
            <Text style={styles.subtitle}>{selectedDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</Text>
            <Text style={styles.note}>{formatLei(dayRecords.reduce((sum, record) => sum + record.amountBani, 0))} spent</Text>
            {dayRecords.map(paymentRow)}
            <View style={styles.actions}><Button disabled={dateKey > todayKey} icon="add" label="Record for this date" onPress={() => open({ mode: "record" })} variant="secondary" /></View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Keep financial cards and columns consistent with the existing clay trackers.
  page: { gap: 20 }, heading: { alignItems: "center", flexDirection: "row", gap: 12 }, optionsAnchor: { width: 36, flexDirection: "row" }, menuOverlay: { flex: 1 },
  budgetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, budget: { backgroundColor: COLORS.surface, borderRadius: 22, padding: 16, gap: 8, flexGrow: 1, flexBasis: 175, minWidth: 0 },
  cardHeading: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 }, cardTitle: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 16, flex: 1 },
  balance: { color: COLORS.secondary, fontFamily: FONT_FAMILY.extraBold, fontSize: 21 }, negative: { color: COLORS.gradientPlum },
  layout: { gap: 22 }, columns: { alignItems: "flex-start", flexDirection: "row" }, section: { gap: 14, minWidth: 0 },
  categoryColumn: { flex: 1 }, recordsColumn: { flex: 1.25 }, chartColumn: { flex: 1.35 }, panel: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 18, gap: 12 },
  payment: { backgroundColor: COLORS.background, borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  expenseRow: { flexDirection: "row", alignItems: "center", gap: 8 }, details: { flex: 1, minWidth: 0, gap: 4 }, dot: { borderRadius: 6, height: 12, width: 12 }, actions: { flexDirection: "row" },
  subtitle: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 16, flexShrink: 1 }, name: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 15 },
  amount: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 15 }, note: { color: COLORS.mutedText, fontFamily: FONT_FAMILY.regular, fontSize: 13 },
  title: { color: COLORS.primary, fontFamily: FONT_FAMILY.extraBold, fontSize: 21 },
});
