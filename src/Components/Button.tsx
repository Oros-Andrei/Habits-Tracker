import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SectionIcon, type SectionIconName } from "./SectionIcon";
import { COLORS, SOFT_SHADOW } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "scroll" | "segment";
  icon?: SectionIconName;
  disabled?: boolean;
  // Compact icon actions reuse the shared button without a visible text label.
  iconOnly?: boolean;
  // Supplying checked renders the shared action as an accessible checkbox without visible text.
  checked?: boolean;
  // Disclosures and compact section tabs share the app's button styling and accessibility.
  expanded?: boolean;
  selected?: boolean;
};

// Share button shape, clay depth, and typography across the app's actions.
export function Button({ label, onPress, variant = "primary", icon, disabled = false, checked, expanded, selected, iconOnly = false }: ButtonProps) {
  const secondary = variant === "secondary";
  // Reuse this button for compact, transparent scrollbar arrows.
  const scrollControl = variant === "scroll";
  const checkbox = checked !== undefined;
  const disclosure = expanded !== undefined;
  const segment = variant === "segment";
  // Let standalone characters fill the existing button area instead of sitting inside a frame.
  const iconSize = iconOnly && !scrollControl ? 36 : icon === "save" ? 25 : 20;

  return (
    <Pressable
      accessibilityLabel={checkbox || iconOnly ? label : undefined}
      accessibilityRole={checkbox ? "checkbox" : segment ? "tab" : "button"}
      accessibilityState={{ disabled, checked, expanded, selected }}
      hitSlop={scrollControl ? 4 : undefined}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        checkbox ? styles.checkboxButton : disclosure ? styles.disclosureButton : segment ? styles.segment : scrollControl ? styles.scrollControl : secondary ? styles.secondary : styles.primary,
        checkbox && Platform.OS === "android" && styles.androidCheckboxButton,
        segment && selected && styles.segmentSelected,
        iconOnly && !scrollControl && styles.iconOnly,
        // Saving still blocks presses, but Android clay controls must not flash as they disable.
        disabled && !(Platform.OS === "android" && (checkbox || iconOnly)) && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {checkbox ? (
        <View style={[styles.checkbox, Platform.OS === "android" && styles.androidCheckbox, checked && styles.checkboxChecked]}>
          {checked ? <SectionIcon name="check" size={Platform.OS === "android" ? 17 : 20} /> : null}
        </View>
      ) : icon && !disclosure ? (
        <View style={styles.icon}>
          <SectionIcon name={icon} size={iconSize} />
        </View>
      ) : null}
      {!checkbox && !iconOnly ? <Text style={[styles.label, secondary && styles.secondaryLabel, disclosure && styles.disclosureLabel, segment && styles.segmentLabel, segment && selected && styles.segmentSelectedLabel]}>{label}</Text> : null}
      {disclosure && icon ? <View style={styles.disclosureIcon}><SectionIcon name={icon} size={16} /></View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: "center", borderRadius: 16, flex: 1, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 50, paddingHorizontal: 14 },
  // Remove the surrounding surface while preserving compact action sizing and press behavior.
  iconOnly: { backgroundColor: "transparent", borderWidth: 0, borderBottomWidth: 0, shadowOpacity: 0, shadowRadius: 0, elevation: 0, flex: 0, flexBasis: "auto", flexShrink: 0, minHeight: 36, paddingHorizontal: 0, width: 36 },
  // Leave the scrollbar track visible through its compact arrow controls.
  scrollControl: { backgroundColor: "transparent", flex: 0, flexBasis: "auto", flexShrink: 0, minHeight: 24, paddingHorizontal: 0, width: 24 },
  // Preserve checkbox width on the web, where flex: 0 otherwise gives it a zero flex basis.
  checkboxButton: { flex: 0, flexBasis: "auto", flexShrink: 0, paddingHorizontal: 0, width: 44 },
  checkbox: { alignItems: "center", backgroundColor: COLORS.surface, borderColor: COLORS.divider, borderRadius: 7, borderWidth: 2, height: 28, justifyContent: "center", width: 28, ...SOFT_SHADOW },
  checkboxChecked: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  // The small visual checkbox stays beside the name with a full-height Android touch target.
  androidCheckboxButton: { width: 32, minHeight: 44 },
  androidCheckbox: { height: 23, width: 23, borderRadius: 4, borderWidth: 1.5 },
  // Reserve the chevron's width while long disclosure labels wrap on narrow Android screens.
  disclosureButton: { backgroundColor: "transparent", minHeight: 44, paddingHorizontal: 0 },
  disclosureLabel: { color: COLORS.primary, flex: 1, minWidth: 0 }, disclosureIcon: { flexShrink: 0, width: 18, alignItems: "center" },
  segment: { backgroundColor: "transparent", minHeight: 42, paddingHorizontal: 6, borderRadius: 12 },
  segmentSelected: { backgroundColor: COLORS.surface, ...SOFT_SHADOW },
  segmentLabel: { color: COLORS.mutedText, fontSize: 13 }, segmentSelectedLabel: { color: COLORS.secondary },
  // Keep both button states consistent with the app's soft-clay palette.
  primary: { backgroundColor: COLORS.secondary, borderBottomColor: "#006B73", borderBottomWidth: 3, ...SOFT_SHADOW },
  secondary: { backgroundColor: COLORS.surface, borderColor: "#E6DED4", borderWidth: 1 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.82, transform: [{ translateY: 1 }] },
  icon: { alignItems: "center", justifyContent: "center" },
  label: { color: COLORS.white, fontFamily: FONT_FAMILY.bold, fontSize: 15 },
  secondaryLabel: { color: COLORS.primary },
});
