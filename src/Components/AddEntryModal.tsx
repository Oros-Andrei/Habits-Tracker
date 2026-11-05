import { useRef, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "./Button";
import { Dropdown } from "./Dropdown";
import { ScrollArea } from "./ScrollArea";
import { SectionIcon, type SectionIconName } from "./SectionIcon";
import { TextBox } from "./TextBox";
import { COLORS, SOFT_SHADOW, SURFACE_SHADOW } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";
import type { HabitEntryType, TrackerEntry, TrackerEntryType } from "../Resources/types";

type AddEntryModalProps = {
  visible: boolean;
  // A section may lock creation to its own entry type while Dashboard keeps all choices.
  fixedType?: TrackerEntryType;
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
export function AddEntryModal({ visible, fixedType, onClose, onSave }: AddEntryModalProps) {
  const [type, setType] = useState<TrackerEntryType>();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Confirm successful saves in place and prevent duplicate submissions before React re-renders.
  const [success, setSuccess] = useState("");
  const savingRef = useRef(false);
  const entryType = fixedType ?? type;
  const fixedOption = TYPE_OPTIONS.find((option) => option.type === fixedType);
  const handleSave = async () => {
    if (!entryType || !name.trim() || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const savedName = name.trim();
      await onSave(entryType, savedName);
      setName("");
      const savedType = TYPE_OPTIONS.find((option) => option.type === entryType)!.label.toLowerCase();
      setSuccess(`Added a new ${savedType}: ${savedName}.`);
    } catch {
      setError("Could not save this item. Please try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (savingRef.current) return;
    setSuccess("");
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
          {/* Dismissal is explicit, with an X beside the title instead of closing on Save. */}
          <View style={styles.dialogHeader}>
            <Text style={[styles.title, styles.headerTitle]}>{fixedOption ? `Add ${fixedOption.label.toLowerCase()}` : "Add to tracker"}</Text>
            <View style={styles.closeSlot}><Button disabled={saving} icon="close" iconOnly label="Close add dialog" onPress={handleClose} variant="secondary" /></View>
          </View>
          <Text style={styles.description}>
            {fixedOption ? `Give this ${fixedOption.label.toLowerCase()} a name.` : "Choose a section and give it a name."}
          </Text>
          {/* Fixed-type forms omit the section selector so only the requested type can be created. */}
          {!fixedType ? (
            <View style={styles.sectionPicker}>
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
                      disabled={saving}
                      onPress={() => { setType(option.type); setError(""); setSuccess(""); }}
                      style={({ pressed }) => [styles.typeOption, selected && styles.typeOptionSelected, pressed && styles.typeOptionPressed]}
                    >
                      <SectionIcon name={option.icon} size={23} />
                      <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
          <TextBox label="Name" onChangeText={(value) => { if (!savingRef.current) { setName(value); setError(""); setSuccess(""); } }} placeholder="Enter a name" value={name} />
          {success ? <Text accessibilityLiveRegion="polite" style={styles.success}>{success}</Text> : null}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button disabled={saving} icon="close" label="Close" onPress={handleClose} variant="secondary" />
            {/* Pair the primary form action with its matching clay save icon. */}
            <Button disabled={!entryType || !name.trim() || saving} icon="save" label={saving ? "Saving…" : "Save"} onPress={handleSave} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// Use the shared custom scrollbar in bounded dialog bodies while keeping closing actions visible.
export function TrackerDialog({ title, description, children, footer, onClose, closeLabel = "Close dialog" }: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  closeLabel?: string;
}) {
  return (
    <Modal animationType="none" onRequestClose={onClose} transparent visible>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel={closeLabel} accessibilityRole="button" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.center}>
          <View accessibilityViewIsModal style={[styles.card, styles.dialogCard, SURFACE_SHADOW]}>
            {/* Shared dialogs expose the same top-right dismissal action as creation. */}
            <View style={styles.dialogHeader}>
              <Text style={[styles.title, styles.headerTitle]}>{title}</Text>
              <View style={styles.closeSlot}><Button icon="close" iconOnly label={closeLabel} onPress={onClose} variant="secondary" /></View>
            </View>
            {description ? <Text style={styles.description}>{description}</Text> : null}
            <ScrollArea contentContainerStyle={styles.dialogContent} keyboardShouldPersistTaps="handled" nestedScrollEnabled scrollLabel={title} style={styles.dialogScroll}>
              {children}
            </ScrollArea>
            {footer ?? (
              <View style={styles.actions}>
                <Button icon="close" label="Close" onPress={onClose} variant="secondary" />
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Reuse shared dialogs with floating pickers and a distinct membership-removal icon.
export function TrackerEntryPickerModal({ entries, mode, habitType = "goodHabit", onClose, onSave }: {
  entries: TrackerEntry[];
  mode: "add" | "remove";
  // Keep the shared picker wording aligned with its good or bad habit category.
  habitType?: HabitEntryType;
  onClose: () => void;
  onSave: (id: string) => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const removing = mode === "remove";
  const habitWord = habitType === "goodHabit" ? "good" : "bad";
  const handleClose = () => { if (!saving) onClose(); };
  const handleSave = async () => {
    if (saving || !selectedId || !entries.some((entry) => entry.id === selectedId)) return;
    setSaving(true);
    setError("");
    try {
      await onSave(selectedId);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save this change. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <TrackerDialog
      closeLabel="Close habit dialog"
      description={removing ? "Remove a habit from your daily list. Its history will be kept." : `Choose from your saved ${habitWord} habits.`}
      onClose={handleClose}
      title={removing ? "Remove a habit" : `Add a ${habitWord} habit to the list`}
      footer={(
        <View style={styles.actions}>
          <Button disabled={saving} icon="close" label="Cancel" onPress={handleClose} variant="secondary" />
          {/* A list-minus symbol distinguishes membership removal from Cancel. */}
          <Button
            disabled={saving || !entries.some((entry) => entry.id === selectedId)}
            icon={removing ? "removeHabit" : "add"}
            label={saving ? "Saving…" : removing ? "Remove habit" : "Add to list"}
            onPress={handleSave}
          />
        </View>
      )}
    >
      {entries.length > 0 ? (
        <Dropdown
          label={`${habitType === "goodHabit" ? "Good" : "Bad"} habit`}
          onChange={setSelectedId}
          options={entries.map((entry) => ({ label: entry.name, value: entry.id }))}
          placeholder="Choose a habit"
          value={selectedId}
        />
      ) : (
        <Text style={styles.description}>
          {removing ? "No habits in your list to remove." : `No ${habitWord} habits available to add.`}
        </Text>
      )}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </TrackerDialog>
  );
}

const styles = StyleSheet.create({
  // Use a root-level overlay so Add renders consistently on web and Android.
  overlay: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.32)", bottom: 0, elevation: 100, justifyContent: "center", left: 0, padding: 18, position: "absolute", right: 0, top: 0, zIndex: 100 },
  center: { alignItems: "center", flex: 1, justifyContent: "center", width: "100%" },
  card: { backgroundColor: COLORS.surface, borderColor: "#E6DED4", borderRadius: 24, borderWidth: 1, gap: 10, maxWidth: 460, padding: 20, width: "100%", zIndex: 1 },
  // Limit long habit lists and open dropdowns to the available dialog space.
  dialogCard: { maxHeight: "100%" },
  dialogScroll: { flexGrow: 0 },
  dialogContent: { gap: 10, paddingBottom: 2 },
  // Keep long titles clear of the close control without changing the dialog width.
  dialogHeader: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  headerTitle: { flex: 1, minWidth: 0 },
  closeSlot: { flexDirection: "row", width: 36 },
  success: { color: COLORS.gradientGreen, fontFamily: FONT_FAMILY.medium, fontSize: 14 },
  title: { color: COLORS.primary, fontFamily: FONT_FAMILY.extraBold, fontSize: 24 },
  description: { color: COLORS.mutedText, fontFamily: FONT_FAMILY.regular, fontSize: 14, marginTop: -7 },
  sectionPicker: { gap: 10 },
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
