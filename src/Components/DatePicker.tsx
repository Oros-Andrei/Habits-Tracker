import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SectionIcon } from "./SectionIcon";
import { COLORS, SOFT_SHADOW } from "../Resources/theme";
import { Calendar } from "./Calendar";
import { FONT_FAMILY } from "../Resources/typography";

type DatePickerProps = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
};

// This date picker pairs the shared calendar with its matching clay icon.
export function DatePicker({ label, value, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={[styles.field, SOFT_SHADOW]}
      >
        <Text style={styles.value}>{value.toLocaleDateString()}</Text>
        <SectionIcon name="calendar" size={22} />
      </Pressable>
      {open ? (
        <View style={styles.calendar}>
          <Calendar value={value} onChange={(date) => { onChange(date); setOpen(false); }} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, position: "relative" },
  // Keep date labels and values aligned with the shared type system.
  label: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 15 },
  field: {
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
  value: { color: COLORS.primary, fontFamily: FONT_FAMILY.regular, fontSize: 16 },
  calendar: { left: 0, position: "absolute", right: 0, top: 80, zIndex: 10 },
});
