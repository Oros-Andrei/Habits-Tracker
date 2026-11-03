import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";

// This tab reserves a dedicated space for the user's shopping list.
export function ShoppingListTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shopping List</Text>
      <Text style={styles.body}>Your shopping items will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.surface, borderRadius: 24, gap: 8, padding: 22 },
  // Apply shared Nunito styling to this tracker tab's title and copy.
  title: { color: COLORS.primary, fontFamily: FONT_FAMILY.extraBold, fontSize: 21 },
  body: { color: COLORS.mutedText, fontFamily: FONT_FAMILY.regular, fontSize: 15 },
});
