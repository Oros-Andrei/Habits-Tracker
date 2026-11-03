import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";
import type { TrackerEntry } from "../Resources/types";

type TrackerEntryListProps = {
  entries: TrackerEntry[];
  emptyMessage: string;
};

// Reuse one calm list treatment for names added to the four tracker sections.
export function TrackerEntryList({ entries, emptyMessage }: TrackerEntryListProps) {
  if (entries.length === 0) return <Text style={styles.empty}>{emptyMessage}</Text>;

  return (
    <View style={styles.list}>
      {entries.map((entry) => (
        <View key={entry.id} style={styles.row}>
          <Text style={styles.name}>{entry.name}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  // Keep saved names readable without adding visual weight to tracker cards.
  row: { backgroundColor: COLORS.background, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  name: { color: COLORS.primary, fontFamily: FONT_FAMILY.medium, fontSize: 16 },
  empty: { color: COLORS.mutedText, fontFamily: FONT_FAMILY.regular, fontSize: 15 },
});
