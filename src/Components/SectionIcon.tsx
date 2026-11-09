import { Image, View } from "react-native";
import type { TabId } from "../Resources/types";

export type SectionIconName =
  | TabId
  | "add"
  | "check"
  | "close"
  | "removeHabit"
  | "options"
  | "save"
  | "import"
  | "export"
  | "calendar"
  | "chevronDown"
  | "chevronUp"
  | "chevronLeft"
  | "chevronRight";

type SectionIconProps = {
  name: SectionIconName;
  size?: number;
};

const HABIT_CHARACTERS = require("../Resources/habit-characters.png");

// Bundle the approved characters once so every button, menu, and directional control shares them.
const CHARACTER_IMAGES = {
  chores: require("../Resources/chore-character.png"),
  expenses: require("../Resources/expense-character.png"),
  shopping: require("../Resources/shopping-character.png"),
  dashboard: require("../Resources/dashboard-character.png"),
  // Small transparent display assets keep the full-resolution generation files out of the bundle.
  add: require("../Resources/action-characters/add-ui.png"),
  check: require("../Resources/action-characters/check-ui.png"),
  close: require("../Resources/action-characters/cancel-ui.png"),
  removeHabit: require("../Resources/action-characters/remove-ui.png"),
  options: require("../Resources/action-characters/settings-ui.png"),
  save: require("../Resources/action-characters/save-ui.png"),
  import: require("../Resources/action-characters/import-ui.png"),
  export: require("../Resources/action-characters/export-ui.png"),
  calendar: require("../Resources/action-characters/calendar-ui.png"),
  chevronDown: require("../Resources/action-characters/arrow-down-ui.png"),
  chevronUp: require("../Resources/action-characters/arrow-up-ui.png"),
  chevronLeft: require("../Resources/action-characters/arrow-left-ui.png"),
  chevronRight: require("../Resources/action-characters/arrow-right-ui.png"),
} as const;

// Preserve caller sizing and accessibility while replacing the action symbols with the approved art.
export function SectionIcon({ name, size = 22 }: SectionIconProps) {
  // Each half of the transparent habit artwork keeps its existing character and crop.
  if (name === "goodHabits" || name === "badHabits") {
    return (
      <View pointerEvents="none" style={{ width: size, height: size, flexShrink: 0, overflow: "hidden" }}>
        <Image
          accessible={false}
          resizeMode="contain"
          source={HABIT_CHARACTERS}
          style={{ width: size * 2, height: size, position: "absolute", top: 0, left: name === "goodHabits" ? 0 : -size }}
        />
      </View>
    );
  }
  return <Image accessible={false} pointerEvents="none" resizeMode="contain" source={CHARACTER_IMAGES[name]} style={{ width: size, height: size, flexShrink: 0 }} />;
}
