import { useEffect, useRef, type PropsWithChildren } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ActionMenu } from "./ActionMenu";
import { SectionIcon } from "./SectionIcon";
import { COLORS, SOFT_SHADOW, SURFACE_SHADOW } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";
import type { AppShellProps, TabId } from "../Resources/types";

// Use the shared soft-clay set; active state stays on the navigation surface.
const NAV_ITEMS: { id: TabId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "goodHabits", label: "Good Habits" },
  { id: "badHabits", label: "Bad Habits" },
  { id: "expenses", label: "Expenses" },
  { id: "chores", label: "Chores" },
  { id: "shopping", label: "Shopping List" },
];

const PAGE_TITLES: Record<TabId, string> = {
  dashboard: "Overview",
  goodHabits: "Good Habits",
  badHabits: "Bad Habits",
  expenses: "Expenses",
  chores: "Chores",
  shopping: "Shopping List",
};

// Preserve the browser layout with a clay add action and no placeholder profile control.
export function AppShell(props: PropsWithChildren<AppShellProps>) {
  const { activeTab, children, menuVisible, onAction, onGoHome, onTabChange, onToggleMenu } = props;
  const menuRef = useRef<HTMLDivElement>(null);

  // Mirror Garden's pointer boundary check so clicks inside the menu reach its actions.
  useEffect(() => {
    if (!menuVisible) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onToggleMenu();
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [menuVisible, onToggleMenu]);

  return (
    <View style={styles.page}>
      <View pointerEvents="none" style={styles.backgroundShapeTop} />
      <View pointerEvents="none" style={styles.backgroundShapeBottom} />
      <View pointerEvents="none" style={styles.backgroundShapeAccent} />
      <View style={styles.layout}>
        <View style={[styles.sidebar, SURFACE_SHADOW]}>
          {/* Keep the sidebar brand text-only and visually quiet. */}
          <Pressable onPress={onGoHome} style={styles.brand}>
            <Text style={styles.brandText}>Personal Tracker</Text>
          </Pressable>
          <View style={styles.navigation}>
            {NAV_ITEMS.map((item) => {
              const selected = activeTab === item.id;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={item.id}
                  onPress={() => onTabChange(item.id)}
                  style={({ pressed }) => [styles.navItem, selected && styles.navSelected, pressed && styles.navPressed]}
                >
                  <SectionIcon name={item.id} size={22} />
                  <Text style={[styles.navLabel, selected && styles.navLabelSelected]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerStart}>
              {/* Keep creation and backup actions in the Dashboard header only. */}
              {activeTab === "dashboard" ? (
                <div ref={menuRef} style={{ position: "relative", display: "inline-flex", alignItems: "center", zIndex: 60 }}>
                  <Pressable accessibilityLabel="Options" onPress={onToggleMenu} style={styles.optionsButton}>
                    <SectionIcon name="options" size={25} />
                    <Text style={styles.optionsLabel}>Options</Text>
                  </Pressable>
                  <ActionMenu onAction={onAction} showAdd visible={menuVisible} />
                </div>
              ) : null}
              <Text style={styles.pageTitle}>{PAGE_TITLES[activeTab]}</Text>
            </View>
          </View>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: COLORS.background, flex: 1, minHeight: "100%", overflow: "hidden" },
  layout: { flex: 1, flexDirection: "row", minHeight: "100%" },
  sidebar: {
    backgroundColor: "rgba(255,253,248,0.92)",
    borderColor: "#EEE7DE",
    borderRightWidth: 1,
    maxWidth: 300,
    minHeight: "100%",
    paddingHorizontal: 20,
    paddingTop: 34,
    width: 270,
    zIndex: 2,
  },
  brand: { alignItems: "center", marginBottom: 38, paddingHorizontal: 12 },
  // Apply shared Nunito faces to the browser navigation and page heading.
  brandText: { color: COLORS.primary, fontFamily: FONT_FAMILY.extraBold, fontSize: 16 },
  navigation: { gap: 10 },
  navItem: { alignItems: "center", borderRadius: 18, flexDirection: "row", gap: 13, minHeight: 55, paddingHorizontal: 14 },
  navSelected: { backgroundColor: "#E4F0EC", ...SOFT_SHADOW },
  navPressed: { opacity: 0.78 },
  navLabel: { color: COLORS.primary, fontFamily: FONT_FAMILY.medium, fontSize: 15 },
  navLabelSelected: { fontFamily: FONT_FAMILY.extraBold },
  content: { flexGrow: 1, padding: 34, paddingBottom: 54 },
  // Put the whole header above the outside-click surface so menu rows receive presses.
  header: { elevation: 80, marginBottom: 34, minHeight: 86, position: "relative", zIndex: 80 },
  headerStart: { alignItems: "center", flexDirection: "row", gap: 14 },
  optionsButton: { alignItems: "center", backgroundColor: COLORS.surface, borderColor: "#E6DED4", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 8, minHeight: 48, paddingHorizontal: 14, ...SOFT_SHADOW },
  optionsLabel: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 15 },
  pageTitle: { color: COLORS.primary, flexShrink: 1, fontFamily: FONT_FAMILY.extraBold, fontSize: 38, marginLeft: 8 },
  backgroundShapeTop: { backgroundColor: "rgba(0,136,151,0.10)", borderRadius: 180, height: 290, position: "absolute", right: -85, top: -165, width: 390 },
  backgroundShapeBottom: { backgroundColor: "rgba(7,134,101,0.08)", borderRadius: 220, bottom: -170, height: 280, left: 280, position: "absolute", width: "60%" },
  backgroundShapeAccent: { backgroundColor: "rgba(56,36,46,0.035)", borderRadius: 120, bottom: 170, height: 170, position: "absolute", right: 90, width: 230 },
});
