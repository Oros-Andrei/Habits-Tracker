import { Pressable, StyleSheet, Text, View } from "react-native";
import { SectionIcon, type SectionIconName } from "./SectionIcon";
import { COLORS, SOFT_SHADOW } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  icon?: SectionIconName;
  disabled?: boolean;
};

// Share button shape, clay depth, and typography across the app's actions.
export function Button({ label, onPress, variant = "primary", icon, disabled = false }: ButtonProps) {
  const secondary = variant === "secondary";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.secondary : styles.primary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {icon ? (
        <View style={styles.icon}>
          <SectionIcon name={icon} size={icon === "save" ? 25 : 20} />
        </View>
      ) : null}
      <Text style={[styles.label, secondary && styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: "center", borderRadius: 16, flex: 1, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 50, paddingHorizontal: 14 },
  // Keep both button states consistent with the app's soft-clay palette.
  primary: { backgroundColor: COLORS.secondary, borderBottomColor: "#006B73", borderBottomWidth: 3, ...SOFT_SHADOW },
  secondary: { backgroundColor: COLORS.surface, borderColor: "#E6DED4", borderWidth: 1 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.82, transform: [{ translateY: 1 }] },
  icon: { alignItems: "center", justifyContent: "center" },
  label: { color: COLORS.white, fontFamily: FONT_FAMILY.bold, fontSize: 15 },
  secondaryLabel: { color: COLORS.primary },
});
