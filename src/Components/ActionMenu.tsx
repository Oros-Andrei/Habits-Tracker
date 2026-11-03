import { Pressable, StyleSheet, Text, View } from "react-native";
import { SectionIcon } from "./SectionIcon";
import { COLORS, SOFT_SHADOW } from "../Resources/theme";
import type { ActionMenuItem } from "../Resources/types";
import { FONT_FAMILY } from "../Resources/typography";

type ActionMenuProps = {
  visible: boolean;
  showAdd: boolean;
  onAction: (action: ActionMenuItem) => void;
};

const ACTIONS: { id: ActionMenuItem; label: string; icon: "add" | "import" | "export" }[] = [
  { id: "add", label: "Add", icon: "add" },
  { id: "import", label: "Import JSON", icon: "import" },
  { id: "export", label: "Export JSON", icon: "export" },
];

// Larger clay arrows keep the JSON backup directions clear in the popup.
export function ActionMenu({ visible, showAdd, onAction }: ActionMenuProps) {
  if (!visible) return null;

  const visibleActions = ACTIONS.filter((action) => showAdd || action.id !== "add");

  return (
    <View accessibilityRole="menu" style={[styles.menu, SOFT_SHADOW]}>
      {visibleActions.map((action) => (
        <Pressable
          accessibilityRole="menuitem"
          key={action.id}
          onPress={() => onAction(action.id)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={styles.iconSlot}>
            <SectionIcon name={action.icon} size={26} />
          </View>
          <Text style={styles.label}>{action.label}</Text>
          {action.id === "add" ? (
            <View style={styles.chevronSlot}>
              <SectionIcon name="chevronRight" size={18} />
            </View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    // Keep the popup on its original warm neutral surface.
    backgroundColor: COLORS.surface,
    borderColor: "#E8E1D8",
    borderRadius: 22,
    borderWidth: 1,
    left: 0,
    minWidth: 230,
    padding: 10,
    position: "absolute",
    top: 62,
    // Keep menu rows above the full-screen outside-click target.
    elevation: 70,
    zIndex: 70,
  },
  row: {
    alignItems: "center",
    borderRadius: 15,
    flexDirection: "row",
    minHeight: 52,
    paddingHorizontal: 12,
  },
  pressed: { backgroundColor: "#EAF3F0" },
  iconSlot: { alignItems: "center", justifyContent: "center", width: 38 },
  // Use the shared Nunito face for popup action labels.
  label: { color: COLORS.primary, flex: 1, fontFamily: FONT_FAMILY.medium, fontSize: 16 },
  chevronSlot: { alignItems: "center", justifyContent: "center", width: 24 },
});
