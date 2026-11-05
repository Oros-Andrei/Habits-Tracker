import { Pressable, StyleSheet, Text, View } from "react-native";
import { SectionIcon } from "./SectionIcon";
import { CATEGORY_COLORS } from "../Resources/expenseLedger";
import { COLORS } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";

// Named, accessible clay swatches give categories stable colours shared with the pie chart.
export function ColorPalette({ value, onChange, disabled = false }: { value: string; onChange: (color: string) => void; disabled?: boolean }) {
  const names = ["Teal", "Green", "Plum", "Blue", "Purple", "Rose", "Orange", "Gold", "Sage", "Ocean", "Brown", "Slate"];
  return <View style={styles.field}>
    <Text style={styles.label}>Category colour</Text>
    <View style={styles.palette}>{CATEGORY_COLORS.map((color, index) => <Pressable key={color} accessibilityRole="button"
      accessibilityLabel={names[index]} accessibilityState={{ selected: color === value, disabled }} disabled={disabled} onPress={() => onChange(color)}
      style={[styles.swatch, { backgroundColor: color }, color === value && styles.selected]}>
      {color === value ? <SectionIcon name="check" size={24} /> : null}
    </Pressable>)}</View>
  </View>;
}
const styles = StyleSheet.create({
  field: { gap: 8 }, label: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 15 },
  palette: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: { alignItems: "center", justifyContent: "center", borderRadius: 14, borderWidth: 2, borderColor: "transparent", height: 44, width: 44 },
  selected: { borderColor: COLORS.primary },
});
