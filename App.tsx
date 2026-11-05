import { useEffect, useRef, useState } from "react";
import { Alert, AppState, Platform, Text } from "react-native";
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import { useFonts } from "expo-font";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as SplashScreen from "expo-splash-screen";
import { AddEntryModal } from "./src/Components/AddEntryModal";
import { AppShell } from "./src/Components/AppShell";
import { BadHabitsTab } from "./src/Tabs/BadHabitsTab";
import { ChoresTab } from "./src/Tabs/ChoresTab";
import { DashboardTab } from "./src/Tabs/DashboardTab";
import { ExpensesTab } from "./src/Tabs/ExpensesTab";
import { GoodHabitsTab } from "./src/Tabs/GoodHabitsTab";
import { ShoppingListTab } from "./src/Tabs/ShoppingListTab";
import { getLocalDateKey, loadTrackerSnapshot, mergeTrackerSnapshot, parseTrackerBackup, saveTrackerSnapshot } from "./src/Resources/trackerStorage";
import { applyExpenseAction, emptyExpenseBook } from "./src/Resources/expenseLedger";
import { updateChore } from "./src/Resources/choreSchedule";
import { syncChoreReminders } from "./src/Resources/choreReminders";
import type { ActionMenuItem, ChoreAction, ExpenseAction, ExpenseBook, HabitAction, HabitEntryType, TabId, TrackerEntry, TrackerEntryType, TrackerSnapshot } from "./src/Resources/types";

// Keep the launch screen visible until the rounded font faces are ready.
void SplashScreen.preventAutoHideAsync();

// This root keeps navigation state shared between the browser and Android shells.
export default function App() {
  // Wait for Nunito before rendering so the native system font never flashes first.
  const [fontsLoaded] = useFonts({ Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold });
  const [entries, setEntries] = useState<TrackerEntry[]>([]);
  // Financial data shares the same snapshot and write lock as all tracker entries.
  const [expenses, setExpenses] = useState<ExpenseBook>(emptyExpenseBook);
  const expensesRef = useRef<ExpenseBook>(emptyExpenseBook());
  const [entriesLoaded, setEntriesLoaded] = useState(false);
  // Use the latest persisted snapshot and reject overlapping writes across tracker actions.
  const entriesRef = useRef<TrackerEntry[]>([]);
  const savingRef = useRef(false);
  const [storageError, setStorageError] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [menuVisible, setMenuVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  // Reuse the same creation dialog for Dashboard and the Good Habits section.
  const [addEntryType, setAddEntryType] = useState<TrackerEntryType>();
  // Reminder delivery is device-specific; saved plans remain portable between browser and Android.
  const [reminderNotice, setReminderNotice] = useState<string>();

  // Load saved entries before allowing writes so startup cannot replace stored data.
  useEffect(() => {
    let mounted = true;
    loadTrackerSnapshot()
      .then((saved) => {
        if (mounted) {
          entriesRef.current = saved.entries; setEntries(saved.entries);
          expensesRef.current = saved.expenses; setExpenses(saved.expenses);
        }
      })
      // Stop on failed reads so an empty screen cannot overwrite existing completion history.
      .catch(() => { if (mounted) setStorageError("Saved data could not be loaded. Reload the app to try again. Your saved data has not been changed."); })
      .finally(() => { if (mounted) setEntriesLoaded(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (fontsLoaded && entriesLoaded) void SplashScreen.hideAsync();
  }, [entriesLoaded, fontsLoaded]);

  // Keep local alarms reconciled across all tabs, after import, on resume, and while the browser is open.
  useEffect(() => {
    if (!entriesLoaded || storageError) return;
    let mounted = true;
    let busy = false;
    const refresh = async () => {
      if (busy) return;
      busy = true;
      try {
        const notice = await syncChoreReminders(entriesRef.current);
        if (mounted) setReminderNotice(notice);
      } catch { if (mounted) setReminderNotice("Reminders could not be updated. Your schedules are still saved."); }
      finally { busy = false; }
    };
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 30000);
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") void refresh(); });
    return () => { mounted = false; clearInterval(timer); subscription.remove(); };
  }, [entries, entriesLoaded, storageError]);

  if (!fontsLoaded || !entriesLoaded) return null;
  if (storageError) return <Text accessibilityRole="alert">{storageError}</Text>;

  // Commit each complete snapshot before exposing it to checklist, creation, or import actions.
  const persistSnapshot = async (update: (current: TrackerSnapshot) => TrackerSnapshot) => {
    if (savingRef.current) throw new Error("Another change is being saved. Please try again.");
    savingRef.current = true;
    try {
      const next = update({ entries: entriesRef.current, expenses: expensesRef.current });
      await saveTrackerSnapshot(next);
      entriesRef.current = next.entries; expensesRef.current = next.expenses;
      setEntries(next.entries); setExpenses(next.expenses);
    } finally {
      savingRef.current = false;
    }
  };

  // Habit, chore, and name changes preserve the latest financial ledger automatically.
  const persistEntries = (update: (current: TrackerEntry[]) => TrackerEntry[]) =>
    persistSnapshot((current) => ({ ...current, entries: update(current.entries) }));

  // Keep platform messages native on Android and simple browser dialogs on web.
  const showBackupMessage = (title: string, message: string) => {
    if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  // Follow Garden's browser download and Android share-sheet backup flow.
  const handleExport = async () => {
    try {
      const backup = {
        app: "habits-tracker" as const,
        // Version 5 includes category assignments, payment history, and effective-dated income amounts.
        formatVersion: 5 as const,
        exportedAt: new Date().toISOString(),
        entries: entriesRef.current,
        expenses: expensesRef.current,
      };
      const backupText = `${JSON.stringify(backup, null, 2)}\n`;
      const filename = `habits-tracker-${new Date().toISOString().slice(0, 10)}.json`;

      if (Platform.OS === "web") {
        const blob = new Blob([backupText], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }

      const cacheDirectory = FileSystem.cacheDirectory;
      if (!cacheDirectory) throw new Error("The backup file could not be created on this device.");
      const fileUri = `${cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, backupText);
      await Sharing.shareAsync(fileUri, { mimeType: "application/json", dialogTitle: "Export Habits Tracker backup" });
    } catch (error) {
      showBackupMessage("Export failed", error instanceof Error ? error.message : "The backup could not be exported.");
    }
  };

  // Parse and validate the entire selected file before merging or saving any entries.
  const handleImport = async () => {
    try {
      const selection = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (selection.canceled) return;

      const asset = selection.assets[0];
      const backupText = Platform.OS === "web" && asset.file
        ? await asset.file.text()
        : await FileSystem.readAsStringAsync(asset.uri);
      const backup = parseTrackerBackup(JSON.parse(backupText) as unknown);
      // Merge against the latest data even if habits changed while the file picker was open.
      await persistSnapshot((current) => mergeTrackerSnapshot(current, backup));
      showBackupMessage("Import complete", `${backup.entries.length} saved entries were merged into this device.`);
    } catch (error) {
      showBackupMessage("Import failed", error instanceof Error ? error.message : "The backup could not be imported. Your saved data was left unchanged.");
    }
  };

  const handleAction = (action: ActionMenuItem) => {
    setMenuVisible(false);
    if (action === "add") {
      setAddEntryType(undefined);
      setAddModalVisible(true);
    }
    else if (action === "import") void handleImport();
    else void handleExport();
  };

  // Save each name before updating the screen so failed writes remain retryable.
  const handleAdd = async (type: TrackerEntryType, name: string) => {
    const entry: TrackerEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      type,
    };
    // Let the creation form show success and accept another name until explicitly closed.
    await persistEntries((current) => [...current, entry]);
  };

  // Keep good and bad history independent while applying the same local-day actions to both.
  const handleHabitUpdate = async (type: HabitEntryType, id: string, action: HabitAction) => {
    const trackingField = type === "goodHabit" ? "goodHabitTracking" : "badHabitTracking";
    await persistEntries((current) => {
      if (!current.some((entry) => entry.id === id && entry.type === type)) {
        throw new Error("This habit is no longer available.");
      }
      const today = getLocalDateKey(new Date());
      return current.map((entry) => {
        if (entry.id !== id) return entry;
        const tracking = entry[trackingField] ?? { active: false, completedDates: [] };
        if (action === "toggleDone" && !tracking.active) {
          throw new Error("Add this habit to your daily list before recording it.");
        }
        return {
          ...entry,
          [trackingField]: {
            active: action === "add" ? true : action === "remove" ? false : tracking.active,
            completedDates: action !== "toggleDone" ? tracking.completedDates
              : tracking.completedDates.includes(today)
                ? tracking.completedDates.filter((date) => date !== today)
                : [...tracking.completedDates, today].sort(),
          },
        };
      });
    });
  };

  // Apply chore changes to the latest snapshot and expose them only after a successful write.
  const handleChoreUpdate = async (id: string, action: ChoreAction) => {
    await persistEntries((current) => {
      if (!current.some((entry) => entry.id === id && entry.type === "chore")) throw new Error("This chore is no longer available.");
      const today = getLocalDateKey(new Date());
      return current.map((entry) => entry.id === id ? updateChore(entry, action, today) : entry);
    });
  };

  const screen = (() => {
    switch (activeTab) {
      case "goodHabits":
        return (
          <GoodHabitsTab
            entries={entries.filter((entry) => entry.type === "goodHabit")}
            onCreate={() => { setAddEntryType("goodHabit"); setAddModalVisible(true); }}
            onUpdate={(id, action) => handleHabitUpdate("goodHabit", id, action)}
          />
        );
      case "badHabits":
        return (
          <BadHabitsTab
            entries={entries.filter((entry) => entry.type === "badHabit")}
            onCreate={() => { setAddEntryType("badHabit"); setAddModalVisible(true); }}
            onUpdate={(id, action) => handleHabitUpdate("badHabit", id, action)}
          />
        );
      case "expenses":
        return <ExpensesTab entries={entries.filter((entry) => entry.type === "expenseType")} book={expenses}
          onUpdate={(action: ExpenseAction) => persistSnapshot((current) => applyExpenseAction(current, action, getLocalDateKey(new Date())))} />;
      case "chores":
        return <ChoresTab entries={entries.filter((entry) => entry.type === "chore")}
          onCreate={() => { setAddEntryType("chore"); setAddModalVisible(true); }}
          onUpdate={handleChoreUpdate} reminderNotice={reminderNotice} />;
      case "shopping":
        return <ShoppingListTab />;
      default:
        // Dashboard totals follow saved completions rather than the number of habit definitions.
        return <DashboardTab entries={entries} expenses={expenses} />;
    }
  })();

  return (
    <>
      <AppShell
        activeTab={activeTab}
        menuVisible={menuVisible}
        onAction={handleAction}
        onGoHome={() => { setActiveTab("dashboard"); setMenuVisible(false); }}
        onTabChange={(tab) => { setActiveTab(tab); setMenuVisible(false); }}
        onToggleMenu={() => setMenuVisible((visible) => !visible)}
      >
        {screen}
      </AppShell>
      <AddEntryModal
        fixedType={addEntryType}
        key={addEntryType ?? "all"}
        onClose={() => setAddModalVisible(false)}
        onSave={handleAdd}
        visible={addModalVisible}
      />
    </>
  );
}
