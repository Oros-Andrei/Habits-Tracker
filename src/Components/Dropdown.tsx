import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SectionIcon } from "./SectionIcon";
import { COLORS, SOFT_SHADOW } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";

type DropdownProps = {
  label: string;
  options: string[];
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

// A clay chevron keeps option selection consistent across tracker forms.
export function Dropdown({ label, options, value, placeholder = "Choose an option", onChange }: DropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={[styles.trigger, SOFT_SHADOW]}
      >
        <Text style={[styles.value, !value && styles.placeholder]}>{value ?? placeholder}</Text>
        <View style={styles.chevronSlot}>
          <SectionIcon name={open ? "chevronUp" : "chevronDown"} size={18} />
        </View>
      </Pressable>
      {open ? (
        <View style={[styles.options, SOFT_SHADOW]}>
          {options.map((option) => (
            <Pressable
              accessibilityRole="button"
              key={option}
              onPress={() => {
                onChange(option);
                setOpen(false);
              }}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            >
              <Text style={styles.optionText}>{option}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, position: "relative" },
  // Share Nunito typography across dropdown labels, values, and options.
  label: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 15 },
  trigger: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: "#E6DED4",
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: 16,
  },
  value: { color: COLORS.primary, flex: 1, fontFamily: FONT_FAMILY.regular, fontSize: 16 },
  placeholder: { color: COLORS.mutedText },
  chevronSlot: { alignItems: "center", justifyContent: "center", marginLeft: 12, width: 24 },
  options: {
    backgroundColor: COLORS.surface,
    borderRadius: 17,
    left: 0,
    padding: 7,
    position: "absolute",
    right: 0,
    top: 78,
    zIndex: 10,
  },
  option: { borderRadius: 12, minHeight: 44, justifyContent: "center", paddingHorizontal: 12 },
  optionPressed: { backgroundColor: "#EAF3F0" },
  optionText: { color: COLORS.primary, fontFamily: FONT_FAMILY.regular, fontSize: 15 },
});
