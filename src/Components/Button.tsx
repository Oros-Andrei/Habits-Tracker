import { Pressable, StyleSheet, Text, View } from "react-native";
import { SectionIcon, type SectionIconName } from "./SectionIcon";
import { COLORS, SOFT_SHADOW } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "scroll";
  icon?: SectionIconName;
  disabled?: boolean;
  // Compact icon actions reuse the shared button without a visible text label.
  iconOnly?: boolean;
  // Supplying checked renders the shared action as an accessible checkbox without visible text.
  checked?: boolean;
};

// Share button shape, clay depth, and typography across the app's actions.
export function Button({ label, onPress, variant = "primary", icon, disabled = false, checked, iconOnly = false }: ButtonProps) {
  const secondary = variant === "secondary";
  // Reuse this button for compact, transparent scrollbar arrows.
  const scrollControl = variant === "scroll";
  const checkbox = checked !== undefined;

  return (
    <Pressable
      accessibilityLabel={checkbox || iconOnly ? label : undefined}
      accessibilityRole={checkbox ? "checkbox" : "button"}
      accessibilityState={{ disabled, checked }}
      hitSlop={scrollControl ? 4 : undefined}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        checkbox ? styles.checkboxButton : scrollControl ? styles.scrollControl : secondary ? styles.secondary : styles.primary,
        iconOnly && !scrollControl && styles.iconOnly,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {checkbox ? (
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked ? <SectionIcon name="check" size={20} /> : null}
        </View>
      ) : icon ? (
        <View style={styles.icon}>
          <SectionIcon name={icon} size={icon === "save" ? 25 : 20} />
        </View>
      ) : null}
      {!checkbox && !iconOnly ? <Text style={[styles.label, secondary && styles.secondaryLabel]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: "center", borderRadius: 16, flex: 1, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 50, paddingHorizontal: 14 },
  // Keep heading actions compact without allowing the browser's flex shorthand to collapse them.
  iconOnly: { flex: 0, flexBasis: "auto", flexShrink: 0, minHeight: 36, paddingHorizontal: 0, width: 36 },
  // Leave the scrollbar track visible through its compact arrow controls.
  scrollControl: { backgroundColor: "transparent", flex: 0, flexBasis: "auto", flexShrink: 0, minHeight: 24, paddingHorizontal: 0, width: 24 },
  // Preserve checkbox width on the web, where flex: 0 otherwise gives it a zero flex basis.
  checkboxButton: { flex: 0, flexBasis: "auto", flexShrink: 0, paddingHorizontal: 0, width: 44 },
  checkbox: { alignItems: "center", backgroundColor: COLORS.surface, borderColor: COLORS.divider, borderRadius: 7, borderWidth: 2, height: 28, justifyContent: "center", width: 28, ...SOFT_SHADOW },
  checkboxChecked: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  // Keep both button states consistent with the app's soft-clay palette.
  primary: { backgroundColor: COLORS.secondary, borderBottomColor: "#006B73", borderBottomWidth: 3, ...SOFT_SHADOW },
  secondary: { backgroundColor: COLORS.surface, borderColor: "#E6DED4", borderWidth: 1 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.82, transform: [{ translateY: 1 }] },
  icon: { alignItems: "center", justifyContent: "center" },
  label: { color: COLORS.white, fontFamily: FONT_FAMILY.bold, fontSize: 15 },
  secondaryLabel: { color: COLORS.primary },
});
