import { useEffect, useState } from "react";
import { Alert, Platform } from "react-native";
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
import { loadTrackerEntries, mergeTrackerEntries, parseTrackerBackup, saveTrackerEntries } from "./src/Resources/trackerStorage";
import type { ActionMenuItem, TabId, TrackerEntry, TrackerEntryType } from "./src/Resources/types";

// Keep the launch screen visible until the rounded font faces are ready.
void SplashScreen.preventAutoHideAsync();

// This root keeps navigation state shared between the browser and Android shells.
export default function App() {
  // Wait for Nunito before rendering so the native system font never flashes first.
  const [fontsLoaded] = useFonts({ Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold });
  const [entries, setEntries] = useState<TrackerEntry[]>([]);
  const [entriesLoaded, setEntriesLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [menuVisible, setMenuVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);

  // Load saved entries before allowing writes so startup cannot replace stored data.
  useEffect(() => {
    let mounted = true;
    loadTrackerEntries()
      .then((savedEntries) => { if (mounted) setEntries(savedEntries); })
      .catch(() => { if (mounted) setEntries([]); })
      .finally(() => { if (mounted) setEntriesLoaded(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (fontsLoaded && entriesLoaded) void SplashScreen.hideAsync();
  }, [entriesLoaded, fontsLoaded]);

  if (!fontsLoaded || !entriesLoaded) return null;

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
        formatVersion: 1 as const,
        exportedAt: new Date().toISOString(),
        entries,
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
      const mergedEntries = mergeTrackerEntries(entries, backup.entries);
      await saveTrackerEntries(mergedEntries);
      setEntries(mergedEntries);
      showBackupMessage("Import complete", `${backup.entries.length} saved entries were merged into this device.`);
    } catch (error) {
      showBackupMessage("Import failed", error instanceof Error ? error.message : "The backup could not be imported. Your saved data was left unchanged.");
    }
  };

  const handleAction = (action: ActionMenuItem) => {
    setMenuVisible(false);
    if (action === "add") setAddModalVisible(true);
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
    const nextEntries = [...entries, entry];
    await saveTrackerEntries(nextEntries);
    setEntries(nextEntries);
    setAddModalVisible(false);
  };

  const screen = (() => {
    switch (activeTab) {
      case "goodHabits":
        return <GoodHabitsTab entries={entries.filter((entry) => entry.type === "goodHabit")} />;
      case "badHabits":
        return <BadHabitsTab entries={entries.filter((entry) => entry.type === "badHabit")} />;
      case "expenses":
        return <ExpensesTab entries={entries.filter((entry) => entry.type === "expenseType")} />;
      case "chores":
        return <ChoresTab entries={entries.filter((entry) => entry.type === "chore")} />;
      case "shopping":
        return <ShoppingListTab />;
      default:
        return <DashboardTab />;
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
        onClose={() => setAddModalVisible(false)}
        onSave={handleAdd}
        visible={addModalVisible}
      />
    </>
  );
}
