import { StyleSheet, Text, View } from "react-native";
import { TrackerEntryList } from "../Components/TrackerEntryList";
import { COLORS } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";
import type { TrackerEntry } from "../Resources/types";

type GoodHabitsTabProps = { entries: TrackerEntry[] };

// This tab reserves a dedicated space for the user's good habits.
export function GoodHabitsTab({ entries }: GoodHabitsTabProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Good Habits</Text>
      {/* Show stored good habits or a clear first-use hint. */}
      <TrackerEntryList emptyMessage="No good habits yet. Use + to add one." entries={entries} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.surface, borderRadius: 24, gap: 8, padding: 22 },
  // Apply shared Nunito styling to this tracker tab's title and copy.
  title: { color: COLORS.primary, fontFamily: FONT_FAMILY.extraBold, fontSize: 21 },
});
