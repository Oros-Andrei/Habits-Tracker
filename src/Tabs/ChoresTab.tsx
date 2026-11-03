import { StyleSheet, Text, View } from "react-native";
import { TrackerEntryList } from "../Components/TrackerEntryList";
import { COLORS } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";
import type { TrackerEntry } from "../Resources/types";

type ChoresTabProps = { entries: TrackerEntry[] };

// This tab reserves a dedicated space for the user's chores.
export function ChoresTab({ entries }: ChoresTabProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chores</Text>
      {/* Show stored chores or a clear first-use hint. */}
      <TrackerEntryList emptyMessage="No chores yet. Use + to add one." entries={entries} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.surface, borderRadius: 24, gap: 8, padding: 22 },
  // Apply shared Nunito styling to this tracker tab's title and copy.
  title: { color: COLORS.primary, fontFamily: FONT_FAMILY.extraBold, fontSize: 21 },
});
