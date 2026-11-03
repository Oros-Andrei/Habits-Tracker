import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "./Button";
import { SectionIcon, type SectionIconName } from "./SectionIcon";
import { TextBox } from "./TextBox";
import { COLORS, SOFT_SHADOW, SURFACE_SHADOW } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";
import type { TrackerEntryType } from "../Resources/types";

type AddEntryModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (type: TrackerEntryType, name: string) => Promise<void>;
};

const TYPE_OPTIONS: { type: TrackerEntryType; label: string; icon: SectionIconName }[] = [
  { type: "goodHabit", label: "Good Habit", icon: "goodHabits" },
  { type: "badHabit", label: "Bad Habit", icon: "badHabits" },
  { type: "expenseType", label: "Expense Type", icon: "expenses" },
  { type: "chore", label: "Chore", icon: "chores" },
];

// One shared form creates named entries for the four requested tracker sections.
export function AddEntryModal({ visible, onClose, onSave }: AddEntryModalProps) {
  const [type, setType] = useState<TrackerEntryType>();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const handleSave = async () => {
    if (!type || !name.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      await onSave(type, name.trim());
      setType(undefined);
      setName("");
    } catch {
      setError("Could not save this item. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    setType(undefined);
    setName("");
    setError("");
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable accessibilityLabel="Close add dialog" onPress={handleClose} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.center}>
        <View accessibilityViewIsModal style={[styles.card, SURFACE_SHADOW]}>
          <Text style={styles.title}>Add to tracker</Text>
          <Text style={styles.description}>Choose a section and give it a name.</Text>
          <Text style={styles.sectionLabel}>Choose a section</Text>
          {/* Keep all entry types visible without a dropdown covering the name field. */}
          <View style={styles.optionsGrid}>
            {TYPE_OPTIONS.map((option) => {
              const selected = type === option.type;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={option.type}
                  onPress={() => { setType(option.type); setError(""); }}
                  style={({ pressed }) => [styles.typeOption, selected && styles.typeOptionSelected, pressed && styles.typeOptionPressed]}
                >
                  <SectionIcon name={option.icon} size={23} />
                  <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextBox label="Name" onChangeText={setName} placeholder="Enter a name" value={name} />
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button icon="close" label="Cancel" onPress={handleClose} variant="secondary" />
            {/* Pair the primary form action with its matching clay save icon. */}
            <Button disabled={!type || !name.trim() || saving} icon="save" label={saving ? "Saving…" : "Save"} onPress={handleSave} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Use a root-level overlay so Add renders consistently on web and Android.
  overlay: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.32)", bottom: 0, elevation: 100, justifyContent: "center", left: 0, padding: 18, position: "absolute", right: 0, top: 0, zIndex: 100 },
  center: { alignItems: "center", flex: 1, justifyContent: "center", width: "100%" },
  card: { backgroundColor: COLORS.surface, borderColor: "#E6DED4", borderRadius: 24, borderWidth: 1, gap: 10, maxWidth: 460, padding: 20, width: "100%", zIndex: 1 },
  title: { color: COLORS.primary, fontFamily: FONT_FAMILY.extraBold, fontSize: 24 },
  description: { color: COLORS.mutedText, fontFamily: FONT_FAMILY.regular, fontSize: 14, marginTop: -7 },
  sectionLabel: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 14 },
  optionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeOption: { alignItems: "center", backgroundColor: COLORS.surface, borderColor: "#E6DED4", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 8, minHeight: 42, paddingHorizontal: 10, width: "48%", ...SOFT_SHADOW },
  typeOptionSelected: { backgroundColor: "#E4F0EC", borderColor: COLORS.secondary, borderWidth: 2 },
  typeOptionPressed: { opacity: 0.82 },
  typeLabel: { color: COLORS.primary, flexShrink: 1, fontFamily: FONT_FAMILY.medium, fontSize: 14 },
  typeLabelSelected: { fontFamily: FONT_FAMILY.bold },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  error: { color: COLORS.gradientPlum, fontFamily: FONT_FAMILY.medium, fontSize: 13 },
});
