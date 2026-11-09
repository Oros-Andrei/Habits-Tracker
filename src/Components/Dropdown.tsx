import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SectionIcon } from "./SectionIcon";
import { ScrollArea } from "./ScrollArea";
import { COLORS, SOFT_SHADOW } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";

type DropdownProps = {
  label: string;
  // Stable values distinguish saved habits that happen to share the same name.
  options: (string | { label: string; value: string })[];
  value?: string;
  placeholder?: string;
  // Financial forms freeze submitted selections while their snapshot is being saved.
  disabled?: boolean;
  onChange: (value: string) => void;
};

// A clay chevron keeps option selection consistent across tracker forms.
export function Dropdown({ label, options, value, placeholder = "Choose an option", disabled = false, onChange }: DropdownProps) {
  const [open, setOpen] = useState(false);
  // Measure a floating popup so opening options never resizes or gets clipped by its dialog.
  const triggerRef = useRef<ComponentRef<typeof View>>(null);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const { width, height } = useWindowDimensions();
  useEffect(() => setOpen(false), [width, height]);
  useEffect(() => { if (disabled || options.length === 0) setOpen(false); }, [disabled, options.length]);
  const choices = options.map((option) => typeof option === "string" ? { label: option, value: option } : option);
  const selectedLabel = choices.find((option) => option.value === value)?.label;
  // Removed choices must show the placeholder, never an internal ID or an empty popup.
  const unavailable = disabled || choices.length === 0;

  const below = Math.max(0, height - anchor.y - anchor.height - 20);
  const above = Math.max(0, anchor.y - 20);
  const openBelow = below >= Math.min(254, choices.length * 44 + 14, above);
  const popupWidth = Math.min(anchor.width, Math.max(0, width - 24));
  const popupPosition = {
    left: Math.max(12, Math.min(anchor.x, width - popupWidth - 12)),
    width: popupWidth,
    top: openBelow ? anchor.y + anchor.height + 8 : undefined,
    bottom: openBelow ? undefined : height - anchor.y + 8,
  };
  const toggleOptions = () => {
    if (unavailable) return;
    if (open) { setOpen(false); return; }
    triggerRef.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      setAnchor({ x, y, width: measuredWidth, height: measuredHeight });
      setOpen(true);
    });
  };

  return (
    <View style={[styles.container, open && styles.containerOpen]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open && !unavailable, disabled: unavailable }}
        disabled={unavailable}
        onPress={toggleOptions}
        ref={triggerRef}
        style={[styles.trigger, SOFT_SHADOW]}
      >
        <Text style={[styles.value, selectedLabel === undefined && styles.placeholder]}>{selectedLabel ?? placeholder}</Text>
        <View style={styles.chevronSlot}>
          <SectionIcon name={open ? "chevronUp" : "chevronDown"} size={18} />
        </View>
      </Pressable>
      {open && !unavailable ? (
        <Modal animationType="none" onRequestClose={() => setOpen(false)} transparent visible>
          <View style={styles.popupOverlay}>
            {/* Use the field's label now that chore and frequency pickers share this dropdown. */}
            <Pressable accessibilityLabel={`Close ${label.toLowerCase()} options`} accessibilityRole="button" onPress={() => setOpen(false)} style={StyleSheet.absoluteFill} />
            <View style={[styles.options, SOFT_SHADOW, popupPosition]}>
              {/* Keep long habit lists bounded with the same custom scrollbar used across the app. */}
              <ScrollArea nestedScrollEnabled keyboardShouldPersistTaps="handled" scrollLabel={`${label.toLowerCase()} options`} style={[styles.optionsScroll, { maxHeight: Math.min(240, Math.max(0, (openBelow ? below : above) - 14)) }]}>
                {choices.map((option) => (
                  <Pressable
                    accessibilityRole="button"
                    key={option.value}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                  >
                    <Text style={styles.optionText}>{option.label}</Text>
                  </Pressable>
                ))}
              </ScrollArea>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, position: "relative" },
  // Raise the whole open dropdown so adjacent buttons cannot cover or intercept its options.
  containerOpen: { elevation: 20, zIndex: 20 },
  // Share Nunito typography across dropdown labels, values, and options.
  label: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 15 },
  trigger: {
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
  value: { color: COLORS.primary, flex: 1, fontFamily: FONT_FAMILY.regular, fontSize: 16 },
  placeholder: { color: COLORS.mutedText },
  chevronSlot: { alignItems: "center", justifyContent: "center", marginLeft: 12, width: 24 },
  options: {
    backgroundColor: COLORS.surface,
    borderRadius: 17,
    padding: 7,
    position: "absolute",
    zIndex: 10,
  },
  // Keep the popup independently dismissible above the unchanged modal layout.
  popupOverlay: { flex: 1 },
  optionsScroll: { maxHeight: 240 },
  option: { borderRadius: 12, minHeight: 44, justifyContent: "center", paddingHorizontal: 12 },
  optionPressed: { backgroundColor: "#EAF3F0" },
  optionText: { color: COLORS.primary, fontFamily: FONT_FAMILY.regular, fontSize: 15 },
});
