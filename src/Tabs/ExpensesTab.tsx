import { useCallback, useEffect, useRef, useState, type ComponentRef } from "react";
import { AppState, Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ActionMenu } from "../Components/ActionMenu";
import { TrackerDialog } from "../Components/AddEntryModal";
import { Button } from "../Components/Button";
import { Calendar } from "../Components/Calendar";
import { ExpenseEditorModal, type ExpenseEditorMode } from "../Components/ExpenseEditorModal";
import { ExpensePieChart } from "../Components/ExpensePieChart";
import { SectionIcon } from "../Components/SectionIcon";
import { expenseCategories, expenseMonthSummary, expenseSourceLabel, formatLei, incomeReceiptDate, isMonthlyCategory, loanRemaining } from "../Resources/expenseLedger";
import { getLocalDateKey } from "../Resources/trackerStorage";
import { COLORS, GRADIENTS, SOFT_SHADOW } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";
import type { ExpenseAction, ExpenseBook, ExpenseRecord, IncomeSource, TrackerEntry } from "../Resources/types";

type ExpensesTabProps = { entries: TrackerEntry[]; book: ExpenseBook; onUpdate: (action: ExpenseAction) => Promise<void> };
type Editor = { mode: ExpenseEditorMode; source?: IncomeSource; categoryId?: string; expenseId?: string; recordId?: string; loanId?: string };
// Reuse the same balance card for recurring income, extra income, and the separate Savings account.
type BudgetCard = { label: string; value: number; note: string; source?: IncomeSource; action?: Editor; actionLabel?: string };

// One selected month drives budgets, the payment list, calendar, and category pie on both platforms.
export function ExpensesTab({ entries, book, onUpdate }: ExpensesTabProps) {
  const { width, height } = useWindowDimensions();
  // Android uses the approved category-focused layout with full-width independent disclosures.
  const android = Platform.OS === "android";
  const [section, setSection] = useState<"categories" | "spending" | "calendar">("categories");
  const [incomeExpanded, setIncomeExpanded] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  // Loans expand independently from spending categories and never contribute to their paid totals.
  const [loansExpanded, setLoansExpanded] = useState(false);
  const columns = Platform.OS === "web" && width >= 1200;
  const [today, setToday] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [month, setMonth] = useState(() => getLocalDateKey(new Date()).slice(0, 7));
  const [menu, setMenu] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const anchor = useRef<ComponentRef<typeof View>>(null);
  const [editor, setEditor] = useState<Editor>();
  // Keep the page compact and open the full history only when requested.
  const [showPayments, setShowPayments] = useState(false);
  // Checkbox payments share the root write guard and report failures without changing saved state.
  const [savingMonthly, setSavingMonthly] = useState(false);
  const monthlyPending = useRef(false);
  const [paymentError, setPaymentError] = useState("");
  const todayKey = getLocalDateKey(today);
  const summary = expenseMonthSummary(book, month, todayKey);
  const categories = expenseCategories(book);
  // Include archived categories only when this month's saved history needs them.
  for (const record of summary.records) if (!categories.some((item) => item.id === record.categoryId)) {
    categories.push({ id: record.categoryId, name: record.categoryName, color: record.categoryColor, active: false });
  }
  const monthDate = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1, 12);
  const counts: Record<string, number> = {};
  for (const record of summary.records) counts[record.date] = (counts[record.date] ?? 0) + 1;
  // Month navigation changes the financial period without letting a stale date select another month.
  const changeMonth = useCallback((date: Date) => {
    const key = getLocalDateKey(date).slice(0, 7);
    setMonth(key);
    setSelectedDate((current) => getLocalDateKey(current).startsWith(key) ? current : new Date(date.getFullYear(), date.getMonth(), 1, 12));
  }, []);
  const chooseDate = (date: Date) => { setMonth(getLocalDateKey(date).slice(0, 7)); setSelectedDate(date); };
  const open = (value: Editor) => { setMenu(false); setEditor(value); };
  const toggleMonthly = async (expenseId: string) => {
    if (monthlyPending.current) return;
    monthlyPending.current = true; setSavingMonthly(true); setPaymentError("");
    try {
      await onUpdate({ type: "toggleMonthly", expenseId, date: month === todayKey.slice(0, 7) ? todayKey : getLocalDateKey(selectedDate) });
    } catch (failure) { setPaymentError(failure instanceof Error ? failure.message : "Could not save this payment. Please try again."); }
    finally { monthlyPending.current = false; setSavingMonthly(false); }
  };
  const openOptions = () => anchor.current?.measureInWindow((x, y, _width, buttonHeight) => {
    setPosition({ left: x, top: y + buttonHeight + 8 }); setMenu(true);
  });
  useEffect(() => {
    const now = new Date(), tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(() => setToday(new Date()), tomorrow.getTime() - now.getTime() + 100);
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") setToday(new Date()); });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [todayKey]);
  const receipt = (source: IncomeSource) => {
    const income = source === "salary" ? summary.salary : summary.mealTickets;
    return income ? `${source === "salary" ? "Payday" : "Receipt date"}: ${incomeReceiptDate(month, income.payDay).toLocaleDateString("en-GB")}` : "Not set for this month";
  };
  const cards: BudgetCard[] = [
    { label: "Salary", value: summary.salary?.amountBani ?? 0, source: "salary", note: receipt("salary") },
    { label: "Meal tickets", value: summary.mealTickets?.amountBani ?? 0, source: "mealTickets", note: receipt("mealTickets") },
    // Show income sources before their remaining balances in the requested reading order.
    { label: "Salary left", value: summary.salaryLeft, note: `${formatLei(summary.spentSalary)} spent` },
    { label: "Meal tickets left", value: summary.ticketsLeft, note: `${formatLei(summary.spentTickets)} spent` },
    { label: "Total left", value: summary.totalLeft, note: "Salary + meal tickets remaining + extra income" },
  ];
  // Use neutral product descriptions for the separate income and Savings cards.
  const accountCards: BudgetCard[] = [
    { label: "Extra income", value: summary.extraIncome, note: "Other income received this month.", action: { mode: "extraIncome" }, actionLabel: "Add extra income" },
    { label: "Savings", value: summary.savings, note: "Funds reserved for future expenses.", action: { mode: "savings" }, actionLabel: "Set savings balance" },
  ];
  // Reuse the same income values and controls inside Android's collapsible balance panel.
  const budgetCard = (card: BudgetCard) => <View key={card.label} style={[styles.budget, SOFT_SHADOW, android && styles.androidBudget]}>
    <View style={styles.cardHeading}><Text style={[styles.cardTitle, android && styles.androidCardTitle]}>{card.label}</Text>
      {card.source ? <View style={styles.optionsAnchor}><Button icon="options" iconOnly label={`Set ${card.label.toLowerCase()}`} onPress={() => open({ mode: "income", source: card.source })} variant="secondary" /></View> : null}
      {card.action ? <View style={styles.optionsAnchor}><Button icon={card.action.mode === "extraIncome" ? "add" : "options"} iconOnly
        label={card.actionLabel!} onPress={() => open(card.action!)} variant="secondary" /></View> : null}
    </View>
    <Text style={[styles.balance, android && styles.androidBalance, card.value < 0 && styles.negative]}>{formatLei(card.value)}</Text>
    <Text style={styles.note}>{card.note}</Text>
  </View>;
  // Pair the name and amount, then wrap metadata naturally inside the shared bounded dialog.
  const paymentRow = (record: ExpenseRecord) => <View key={record.id} style={styles.payment}>
    <View style={[styles.dot, { backgroundColor: record.categoryColor }]} />
    <View style={styles.details}>
      <View style={styles.paymentHeading}><Text style={styles.name}>{record.expenseName}</Text><Text style={styles.amount}>{formatLei(record.amountBani)}</Text></View>
      <Text style={styles.note}>{record.categoryName} · {record.date.split("-").reverse().join("/")} · {expenseSourceLabel(record.source)}</Text>
      {record.note ? <Text style={styles.note}>{record.note}</Text> : null}
    </View>
    <Button icon="removeHabit" iconOnly label={`Remove payment for ${record.expenseName}`} onPress={() => open({ mode: "removeRecord", recordId: record.id })} variant="secondary" />
  </View>;
  // Keep the compact history summary after the chosen Android section and before web charts.
  const paymentSummary = <View style={styles.section}>
    {!android ? <Text style={styles.title}>Payments this month</Text> : null}
    <View style={[styles.panel, styles.paymentSummary, SOFT_SHADOW]}>
      <Text style={styles.subtitle}>{formatLei(summary.totalSpent)} spent · {summary.records.length} {summary.records.length === 1 ? "payment" : "payments"}</Text>
      <View style={styles.paymentSummaryAction}><Button label="View payments" onPress={() => setShowPayments(true)} variant="secondary" /></View>
    </View>
  </View>;
  return (
    <View style={styles.page}>
      <Modal animationType="none" transparent visible={menu} onRequestClose={() => setMenu(false)}>
        <View style={styles.menuOverlay}>
          <Pressable accessibilityLabel="Close expense options" accessibilityRole="button" onPress={() => setMenu(false)} style={StyleSheet.absoluteFill} />
          <ActionMenu visible={menu} menuStyle={{ left: Math.max(12, Math.min(position.left, width - Math.min(340, width - 24) - 12)), top: Math.max(12, Math.min(position.top, height - 356)), minWidth: 0, width: Math.min(340, width - 24) }} actions={[
            { id: "category", label: "Add a category", icon: "add", onPress: () => open({ mode: "category" }) },
            { id: "expense", label: "Add an expense", icon: "expenses", onPress: () => open({ mode: "expense" }) },
            // Regular categories use direct paid entries; membership removal is for recurring items.
            { id: "unassign", label: "Remove a monthly expense", icon: "removeHabit", onPress: () => open({ mode: "unassign" }) },
            { id: "removeCategory", label: "Remove a category", icon: "removeHabit", onPress: () => open({ mode: "removeCategory" }) },
          ]} />
        </View>
      </Modal>
      {editor ? <ExpenseEditorModal mode={editor.mode} entries={entries} book={book}
        date={["savings", "loan", "repayLoan"].includes(editor.mode) ? new Date() : selectedDate} source={editor.source}
        initialCategoryId={editor.categoryId} initialExpenseId={editor.expenseId} recordId={editor.recordId} loanId={editor.loanId} onSave={onUpdate} onClose={() => setEditor(undefined)} /> : null}
      {/* Suspend the list during removal confirmation, then return to its refreshed history. */}
      {showPayments && !editor ? <TrackerDialog title={`Payments · ${monthDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`}
        description={`${formatLei(summary.totalSpent)} spent · ${summary.records.length} ${summary.records.length === 1 ? "payment" : "payments"}`}
        closeLabel="Close payments" onClose={() => setShowPayments(false)}>
        {summary.records.length ? [...summary.records].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).map(paymentRow)
          : <Text style={styles.note}>No payments recorded this month.</Text>}
      </TrackerDialog> : null}
      <View style={styles.heading}>
        <Text style={styles.title}>{monthDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</Text>
        <View ref={anchor} collapsable={false} style={styles.optionsAnchor}><Button icon="options" iconOnly label="Expense options" onPress={openOptions} variant="secondary" /></View>
      </View>
      {paymentError ? <Text accessibilityRole="alert" style={styles.negative}>{paymentError}</Text> : null}
      {android ? <>
        <LinearGradient colors={GRADIENTS.teal} style={[styles.androidTotal, SOFT_SHADOW]}>
          <View style={styles.details}><Text style={styles.androidTotalLabel}>Total left</Text>
            <Text style={styles.androidTotalAmount}>{formatLei(summary.totalLeft)}</Text></View>
          <SectionIcon name="expenses" size={48} />
        </LinearGradient>
        <View style={[styles.androidIncomePanel, SOFT_SHADOW]}>
          <Button label="Income & balances" expanded={incomeExpanded} icon={incomeExpanded ? "chevronUp" : "chevronDown"}
            onPress={() => setIncomeExpanded((value) => !value)} />
          {incomeExpanded ? <View style={styles.budgetGrid}>{cards.slice(0, 4).map(budgetCard)}</View> : null}
        </View>
        {/* Keep all money controls above the category/chart/calendar section navigation. */}
        <View style={styles.budgetGrid}>{accountCards.map(budgetCard)}</View>
        <View accessibilityRole="tablist" accessibilityLabel="Expense sections" style={styles.androidTabs}>
          {(["categories", "spending", "calendar"] as const).map((value) => <Button key={value} variant="segment" selected={section === value}
            label={value === "categories" ? "Categories" : value === "spending" ? "Spending" : "Calendar"} onPress={() => setSection(value)} />)}
        </View>
      </> : <View style={styles.budgetGrid}>{cards.map(budgetCard)}</View>}
      {!android ? <View style={styles.budgetGrid}>{accountCards.map(budgetCard)}</View> : null}
        {!android || section === "categories" ? <View style={styles.section}>
          {!android ? <Text style={styles.title}>Categories</Text> : null}
          {/* Category headers share the first row, with each category's expenses stacked beneath it. */}
          <View style={[styles.panel, styles.categoryTable, SOFT_SHADOW, android && styles.androidCategoryTable]}>
            {!categories.length ? <Text style={[styles.note, styles.emptyCategories]}>Use Options to create a category and choose its colour.</Text> : null}
            <View style={[styles.categoryBoard, !columns && styles.categoryBoardNarrow, android && styles.androidCategoryBoard]}>
            {categories.map((category) => {
              const names = entries.filter((entry) => entry.expenseCategoryId === category.id);
              const payments = summary.records.filter((record) => record.categoryId === category.id);
              const expanded = expandedCategories[category.id] === true;
              return <View key={category.id} style={[styles.categoryColumn, !columns && styles.categoryColumnNarrow,
                android && styles.androidCategory, android && SOFT_SHADOW]}>
                <View style={styles.categoryHeader}>
                  <View style={[styles.dot, { backgroundColor: category.color }]} />
                  {android ? <>
                    <Button label={category.name} expanded={expanded} icon={expanded ? "chevronUp" : "chevronDown"}
                      onPress={() => setExpandedCategories((current) => ({ ...current, [category.id]: current[category.id] !== true }))} />
                    <Text style={styles.androidCategoryAmount}>{formatLei(payments.reduce((sum, record) => sum + record.amountBani, 0))}</Text>
                  </> : <Text style={styles.subtitle}>{category.name}</Text>}
                  {category.active ? <Button icon="add" iconOnly label={`Add expense to ${category.name}`} onPress={() => open({ mode: "expense", categoryId: category.id })} variant="secondary" /> : null}
                </View>
                {!android || expanded ? <View style={[styles.categoryContents, android && styles.androidCategoryContents]}>
                  {/* Regular columns show paid records for this month, preserving previous months locally. */}
                  {isMonthlyCategory(category) ? names.length ? names.map((entry) => {
                      const paid = book.records.find((record) => record.monthly && record.expenseId === entry.id && record.date.startsWith(month) && record.date <= todayKey);
                      const fixed = paid ?? entry.monthlyExpense;
                      const funding = fixed ? expenseSourceLabel(fixed.source) : "Salary";
                      return <View key={entry.id} style={styles.expenseChip}>
                        <Button checked={!!paid} disabled={savingMonthly || (!fixed && !paid) || month > todayKey.slice(0, 7)}
                          label={`${entry.name}, ${fixed ? `${formatLei(fixed.amountBani)} from ${funding}, ` : ""}paid for ${month}`}
                          onPress={() => { void toggleMonthly(entry.id); }} />
                        <View style={styles.details}><Text style={styles.name}>{entry.name}</Text>
                          <Text style={styles.note}>{fixed ? `${formatLei(fixed.amountBani)} · ${funding}` : "Set monthly amount and source"}</Text>
                        </View>
                        <Button icon="options" iconOnly label={`Set monthly amount for ${entry.name}`} disabled={savingMonthly}
                          onPress={() => open({ mode: "monthly", expenseId: entry.id })} variant="secondary" />
                      </View>;
                  }) : <Text style={styles.note}>No expenses yet.</Text>
                    : payments.length ? payments.map((record) => <View key={record.id} style={styles.expenseChip}>
                      <View style={styles.details}><Text style={styles.name}>{record.expenseName}</Text>
                        <Text style={styles.note}>{formatLei(record.amountBani)} · {expenseSourceLabel(record.source)}</Text>
                      </View>
                    </View>) : <Text style={styles.note}>No expenses this month.</Text>}
                </View> : null}
              </View>;
            })}
            {/* Debt rows show only the name and amount owed; repayment opens a separate, unfunded form. */}
            <View style={[styles.categoryColumn, !columns && styles.categoryColumnNarrow, styles.lastCategoryColumn, android && styles.androidCategory, android && SOFT_SHADOW]}>
              <View style={styles.categoryHeader}>
                <View style={[styles.dot, { backgroundColor: COLORS.gradientPlum }]} />
                {android ? <Button label="Loans" expanded={loansExpanded} icon={loansExpanded ? "chevronUp" : "chevronDown"}
                  onPress={() => setLoansExpanded((value) => !value)} /> : <Text style={styles.subtitle}>Loans</Text>}
                <Button icon="add" iconOnly label="Add a loan" onPress={() => open({ mode: "loan" })} variant="secondary" />
              </View>
              {!android || loansExpanded ? <View style={[styles.categoryContents, android && styles.androidCategoryContents]}>
                {(book.loans ?? []).filter((loan) => loan.date <= summary.asOf).map((loan) => {
                  const remaining = loanRemaining(book, loan.id, summary.asOf);
                  return <View key={loan.id} style={styles.expenseChip}>
                    <View style={styles.details}><Text style={styles.name}>{loan.name}</Text><Text style={styles.note}>{formatLei(remaining)}</Text></View>
                    <Button disabled={loanRemaining(book, loan.id, todayKey) === 0} icon="add" iconOnly label={`Record payment for ${loan.name}`}
                      onPress={() => open({ mode: "repayLoan", loanId: loan.id })} variant="secondary" />
                  </View>;
                })}
                {!(book.loans ?? []).some((loan) => loan.date <= summary.asOf) ? <Text style={styles.note}>No loans yet.</Text> : null}
              </View> : null}
            </View>
            </View>
          </View>
        </View> : null}
      {!android ? paymentSummary : null}
      {/* Charts sit below both lists, sharing a row on desktop and stacking on smaller screens. */}
      {!android || section !== "categories" ? <View style={[styles.layout, columns && styles.columns]}>
        {!android || section === "spending" ? <View style={[styles.section, columns && styles.overviewColumn]}>
          <Text style={styles.title}>Spending by category</Text>
          <View style={[styles.panel, SOFT_SHADOW]}><ExpensePieChart records={summary.records} /></View>
        </View> : null}
        {!android || section === "calendar" ? <View style={[styles.section, columns && styles.overviewColumn]}>
          <Text style={styles.title}>Calendar</Text>
          <Calendar key={month} value={selectedDate} onChange={chooseDate} onMonthChange={changeMonth} dayCounts={counts} countLabel="payments" />
        </View> : null}
      </View> : null}
      {android ? paymentSummary : null}
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
  overviewColumn: { flex: 1 }, panel: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 18, gap: 12 },
  payment: { backgroundColor: COLORS.background, borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  // Let compact history and its summary wrap on phones without widening the page or dialog.
  paymentHeading: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  paymentSummary: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" },
  paymentSummaryAction: { flexDirection: "row", width: 170, maxWidth: "100%" },
  // Keep vertical expense lists inside equal category columns; stack columns on smaller screens.
  categoryTable: { gap: 0, paddingHorizontal: 8, paddingVertical: 8 }, categoryBoard: { flexDirection: "row", alignItems: "stretch" }, categoryBoardNarrow: { flexDirection: "column" },
  categoryColumn: { flex: 1, minWidth: 0, paddingHorizontal: 12, paddingVertical: 8, borderRightWidth: 1, borderRightColor: COLORS.divider },
  categoryColumnNarrow: { flex: 0, borderRightWidth: 0, borderBottomWidth: 1, borderBottomColor: COLORS.divider }, lastCategoryColumn: { borderRightWidth: 0, borderBottomWidth: 0 },
  categoryHeader: { alignItems: "center", flexDirection: "row", gap: 8, minHeight: 52 }, categoryContents: { gap: 8, paddingTop: 8 },
  expenseChip: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingLeft: 10, paddingRight: 4, paddingVertical: 4, backgroundColor: COLORS.background, borderRadius: 14, maxWidth: "100%" },
  emptyCategories: { paddingVertical: 12, paddingHorizontal: 12 }, details: { flex: 1, minWidth: 0, gap: 4 }, dot: { borderRadius: 6, height: 12, width: 12 },
  subtitle: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 16, flexShrink: 1 }, name: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 15, flexShrink: 1 },
  amount: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 15 }, note: { color: COLORS.mutedText, fontFamily: FONT_FAMILY.regular, fontSize: 13 },
  title: { color: COLORS.primary, fontFamily: FONT_FAMILY.extraBold, fontSize: 21 },
  // Full-width cards prevent neighbor stretching and reserve room for chevrons and Add controls.
  androidTotal: { alignItems: "center", flexDirection: "row", gap: 12, borderRadius: 24, padding: 20 },
  androidTotalLabel: { color: COLORS.white, fontFamily: FONT_FAMILY.medium, fontSize: 14 },
  androidTotalAmount: { color: COLORS.white, fontFamily: FONT_FAMILY.extraBold, fontSize: 30, flexShrink: 1 },
  androidIncomePanel: { backgroundColor: COLORS.surface, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 6, gap: 10 },
  androidBudget: { flexBasis: "44%", padding: 12 }, androidCardTitle: { fontSize: 13 }, androidBalance: { fontSize: 18 },
  androidTabs: { backgroundColor: COLORS.mutedSurface, borderRadius: 18, flexDirection: "row", gap: 4, padding: 5 },
  androidCategoryTable: { backgroundColor: "transparent", padding: 0, paddingHorizontal: 0, paddingVertical: 0, shadowOpacity: 0, elevation: 0 },
  androidCategoryBoard: { gap: 12 },
  androidCategory: { backgroundColor: COLORS.surface, borderRadius: 22, borderBottomWidth: 0, borderRightWidth: 0, paddingHorizontal: 12, paddingVertical: 4 },
  androidCategoryAmount: { color: COLORS.mutedText, fontFamily: FONT_FAMILY.bold, fontSize: 12, maxWidth: 96, flexShrink: 1 },
  androidCategoryContents: { paddingTop: 2, paddingBottom: 10 },
});
