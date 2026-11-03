import type { PropsWithChildren } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ActionMenu } from "./ActionMenu";
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
      {menuVisible ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Close actions" onPress={onToggleMenu} style={styles.dismissBackdrop} />
      ) : null}
      <View style={styles.header}>
        {/* Keep creation and backup actions in the Dashboard header only. */}
        {activeTab === "dashboard" ? (
          <View style={styles.actionAnchor}>
            <Pressable accessibilityLabel="Options" onPress={onToggleMenu} style={styles.optionsButton}>
              <SectionIcon name="options" size={23} />
              <Text style={styles.optionsLabel}>Options</Text>
            </Pressable>
            <ActionMenu onAction={onAction} showAdd visible={menuVisible} />
          </View>
        ) : null}
        <Pressable onPress={onGoHome} style={styles.titleButton}>
          <Text numberOfLines={1} style={styles.title}>{PAGE_TITLES[activeTab]}</Text>
        </Pressable>
        {menuVisible ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Close actions" onPress={onToggleMenu} style={styles.headerDismissBackdrop} />
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {children}
      </ScrollView>

      <View style={[styles.bottomBar, SURFACE_SHADOW]}>
        {NAV_ITEMS.map((item) => {
          const selected = activeTab === item.id;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={item.id}
              onPress={() => onTabChange(item.id)}
              style={styles.navButton}
            >
              <SectionIcon name={item.id} size={20} />
              <Text numberOfLines={1} style={[styles.navLabel, selected && styles.navSelected]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: COLORS.background, flex: 1, overflow: "hidden" },
  backgroundTop: { backgroundColor: "rgba(0,136,151,0.08)", borderRadius: 150, height: 190, position: "absolute", right: -85, top: -115, width: 230 },
  backgroundBottom: { backgroundColor: "rgba(7,134,101,0.08)", borderRadius: 180, bottom: 35, height: 150, left: -70, position: "absolute", width: 260 },
  // Put the whole header above the outside-click surface so menu rows receive presses.
  header: { alignItems: "center", elevation: 80, flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 14, position: "relative", zIndex: 80 },
  // Keep the single Options control and its menu above the outside-click layer.
  actionAnchor: { elevation: 60, position: "relative", zIndex: 60 },
  dismissBackdrop: { bottom: 0, elevation: 20, left: 0, position: "absolute", right: 0, top: 0, zIndex: 20 },
  headerDismissBackdrop: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0, zIndex: 35 },
  optionsButton: { alignItems: "center", backgroundColor: COLORS.surface, borderColor: "#E6DED4", borderRadius: 15, borderWidth: 1, flexDirection: "row", gap: 7, minHeight: 44, paddingHorizontal: 12, ...SURFACE_SHADOW },
  optionsLabel: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 13 },
  titleButton: { flex: 1, marginLeft: 3 },
  // Apply the same rounded Nunito faces in Android navigation and headings.
  title: { color: COLORS.primary, fontFamily: FONT_FAMILY.extraBold, fontSize: 26 },
  content: { flexGrow: 1, gap: 18, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 22 },
  bottomBar: { backgroundColor: COLORS.primary, borderRadius: 24, flexDirection: "row", marginBottom: 14, marginHorizontal: 12, paddingHorizontal: 3, paddingVertical: 10 },
  navButton: { alignItems: "center", flex: 1, justifyContent: "center", minWidth: 0, paddingHorizontal: 2, paddingVertical: 3 },
  navLabel: { color: COLORS.white, fontFamily: FONT_FAMILY.medium, fontSize: 10 },
  navSelected: { color: "#76C9BE" },
});
