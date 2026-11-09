import type { PropsWithChildren } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ActionMenu } from "./ActionMenu";
import { ScrollArea } from "./ScrollArea";
import { SectionIcon } from "./SectionIcon";
import { COLORS, SURFACE_SHADOW } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";
import type { AppShellProps, TabId } from "../Resources/types";

// Reuse the shared soft-clay icon set in the Android navigation bar.
const NAV_ITEMS: { id: TabId; label: string }[] = [
  { id: "goodHabits", label: "Good" },
  { id: "badHabits", label: "Bad" },
  { id: "expenses", label: "Expenses" },
  { id: "chores", label: "Chores" },
  { id: "shopping", label: "Shopping" },
];

const PAGE_TITLES: Record<TabId, string> = {
  dashboard: "Overview",
  goodHabits: "Good Habits",
  badHabits: "Bad Habits",
  expenses: "Expenses",
  chores: "Chores",
  shopping: "Shopping List",
};

// Keep the compact Android header focused on the clay add action and page title.
export function AppShell(props: PropsWithChildren<AppShellProps>) {
  const { activeTab, children, menuVisible, onAction, onGoHome, onTabChange, onToggleMenu } = props;

  return (
    <View style={styles.page}>
      <View pointerEvents="none" style={styles.backgroundTop} />
      <View pointerEvents="none" style={styles.backgroundBottom} />
      <View pointerEvents="none" style={styles.backgroundPlum} />
      {menuVisible ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Close actions" onPress={onToggleMenu} style={styles.dismissBackdrop} />
      ) : null}
      <View style={styles.header}>
        {/* Keep creation and backup actions in the Dashboard header only. */}
        {activeTab === "dashboard" ? (
          <View style={styles.actionAnchor}>
            <Pressable accessibilityRole="button" accessibilityLabel="Options" onPress={onToggleMenu} style={styles.optionsButton}>
              <SectionIcon name="add" size={44} />
            </Pressable>
            <ActionMenu onAction={onAction} showAdd visible={menuVisible} />
          </View>
        ) : <View style={styles.headerSlot} />}
        {/* Equal header slots keep the title centered and expose the approved Overview character. */}
        <Pressable accessibilityRole="button" accessibilityLabel="Return to Overview" onPress={onGoHome} style={styles.titleButton}>
          <Text adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} style={styles.title}>{PAGE_TITLES[activeTab]}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Overview" onPress={onGoHome} style={styles.homeButton}>
          <SectionIcon name="dashboard" size={38} />
        </Pressable>
        {menuVisible ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Close actions" onPress={onToggleMenu} style={styles.headerDismissBackdrop} />
        ) : null}
      </View>

      {/* Keep Android swipe scrolling alongside the shared custom scrollbar controls. */}
      <ScrollArea contentContainerStyle={styles.content} scrollLabel="page content">
        {children}
      </ScrollArea>

      {/* Larger character art and teal dividers reproduce the approved dark clay navigation. */}
      <LinearGradient colors={["#484641", "#252420", "#11110F"]} style={[styles.bottomBar, SURFACE_SHADOW]}>
        {NAV_ITEMS.map((item) => {
          const selected = activeTab === item.id;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={item.id}
              onPress={() => onTabChange(item.id)}
              style={[styles.navButton, selected && styles.navActive]}
            >
              {item.id !== NAV_ITEMS[0].id ? <View pointerEvents="none" style={styles.navDivider} /> : null}
              <SectionIcon name={item.id} size={36} />
              <Text adjustsFontSizeToFit minimumFontScale={0.85} numberOfLines={1} style={[styles.navLabel, selected && styles.navSelected]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: COLORS.background, flex: 1, overflow: "hidden" },
  backgroundTop: { backgroundColor: "rgba(0,136,151,0.08)", borderRadius: 150, height: 190, position: "absolute", right: -85, top: -115, width: 230 },
  backgroundBottom: { backgroundColor: "rgba(7,134,101,0.08)", borderRadius: 180, bottom: 35, height: 150, left: -70, position: "absolute", width: 260 },
  backgroundPlum: { backgroundColor: "rgba(195,101,114,0.10)", borderRadius: 150, bottom: 60, height: 160, right: -110, position: "absolute", width: 250 },
  // Put the whole header above the outside-click surface so menu rows receive presses.
  header: { alignItems: "center", elevation: 80, flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 14, position: "relative", zIndex: 80 },
  // Keep the single Options control and its menu above the outside-click layer.
  actionAnchor: { elevation: 60, position: "relative", zIndex: 60, width: 44 },
  dismissBackdrop: { bottom: 0, elevation: 20, left: 0, position: "absolute", right: 0, top: 0, zIndex: 20 },
  headerDismissBackdrop: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0, zIndex: 35 },
  optionsButton: { alignItems: "center", justifyContent: "center", height: 44, width: 44 },
  headerSlot: { width: 44 },
  homeButton: { alignItems: "center", justifyContent: "center", height: 44, width: 44, borderRadius: 15, backgroundColor: COLORS.surface },
  titleButton: { flex: 1, minWidth: 0, paddingVertical: 8 },
  // Apply the same rounded Nunito faces in Android navigation and headings.
  title: { color: COLORS.primary, fontFamily: FONT_FAMILY.extraBold, fontSize: 28, textAlign: "center" },
  content: { flexGrow: 1, gap: 18, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 22 },
  bottomBar: { borderColor: "#8D8780", borderWidth: 1, borderRadius: 30, flexDirection: "row", marginBottom: 14, marginHorizontal: 12, paddingHorizontal: 4, paddingVertical: 8 },
  navButton: { alignItems: "center", flex: 1, gap: 3, justifyContent: "center", minHeight: 64, minWidth: 0, paddingHorizontal: 2, paddingVertical: 4, borderRadius: 14 },
  navDivider: { backgroundColor: COLORS.secondary, borderRadius: 2, bottom: 6, left: 0, position: "absolute", top: 6, width: 2 },
  navActive: { backgroundColor: "rgba(0,136,151,0.16)" },
  navLabel: { color: COLORS.white, fontFamily: FONT_FAMILY.bold, fontSize: 11 },
  navSelected: { color: "#A7E0D6" },
});
