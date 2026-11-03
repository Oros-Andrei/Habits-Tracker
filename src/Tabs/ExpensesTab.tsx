import { StyleSheet, Text, View } from "react-native";
import { TrackerEntryList } from "../Components/TrackerEntryList";
import { COLORS } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";
import type { TrackerEntry } from "../Resources/types";

type ExpensesTabProps = { entries: TrackerEntry[] };

// This placeholder keeps the separate expenses section ready for its later feature design.
export function ExpensesTab({ entries }: ExpensesTabProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Expenses</Text>
      {/* List named expense types while transaction details are planned separately. */}
      <TrackerEntryList emptyMessage="No expense types yet. Use + to add one." entries={entries} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.surface, borderRadius: 24, gap: 8, padding: 22 },
  // Apply shared Nunito styling to this tracker tab's title and copy.
  title: { color: COLORS.primary, fontFamily: FONT_FAMILY.extraBold, fontSize: 21 },
});
