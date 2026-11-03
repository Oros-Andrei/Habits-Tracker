import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { COLORS, SOFT_SHADOW } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";

type TextBoxProps = {
  label: string;
  value: string;
  placeholder?: string;
  helperText?: string;
  onChangeText: (value: string) => void;
};

// This reusable field matches the approved rounded, softly raised input style.
export function TextBox({ label, value, placeholder, helperText, onChangeText }: TextBoxProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        onBlur={() => setFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        placeholderTextColor={COLORS.mutedText}
        style={[styles.input, SOFT_SHADOW, focused && styles.focused]}
        value={value}
      />
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  // Keep field labels, input text, and helper text in the shared rounded font.
  label: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 15 },
  input: {
    backgroundColor: COLORS.surface,
    borderColor: "#E6DED4",
    borderRadius: 17,
    borderWidth: 1,
    color: COLORS.primary,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  focused: { borderColor: COLORS.secondary, borderWidth: 2 },
  helper: { color: COLORS.mutedText, fontFamily: FONT_FAMILY.regular, fontSize: 13 },
});
