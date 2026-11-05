import type { ReactNode } from "react";
import { Image, View } from "react-native";
import { Circle, G, Path, Rect, Svg } from "react-native-svg";
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

// Habit and chore characters use the approved artwork; other shared icons remain vectors.
const HABIT_CHARACTERS = require("../Resources/habit-characters.png");
const CHORE_CHARACTER = require("../Resources/chore-character.png");
// Bundle the selected expense and shopping characters for consistent offline icons.
const EXPENSE_CHARACTER = require("../Resources/expense-character.png");
const SHOPPING_CHARACTER = require("../Resources/shopping-character.png");
// Keep the selected Dashboard character bundled alongside the matching section artwork.
const DASHBOARD_CHARACTER = require("../Resources/dashboard-character.png");
const ICONS: Record<Exclude<SectionIconName, "goodHabits" | "badHabits" | "chores" | "expenses" | "shopping" | "dashboard">, ReactNode> = {
  // Reuse a clear clay checkmark inside shared checkbox controls.
  check: (
    <G>
      <Path d="m5 12 4 4 10-10" fill="none" stroke="#006B73" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" transform="translate(0 1)" />
      <Path d="m5 12 4 4 10-10" fill="none" stroke="#FFFDF8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </G>
  ),
  // Keep the clay layers and outline the floppy silhouette without a separate frame.
  save: (
    <G>
      <Path d="M5 3h12l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" fill="#006B73" />
      <Path d="M5 2h12l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" fill="#008897" />
      <Path d="M7 2.5h9v5H7z" fill="#24382B" />
      <Path d="M8 2.5h5.5v4H8z" fill="#FFFDF8" />
      <Rect x={7} y={10} width={10} height={8} rx={1.2} fill="#D7D1C8" />
      <Rect x={7} y={9.5} width={10} height={8} rx={1.2} fill="#FFFDF8" />
      <Path d="M9 11h6m-6 2h6m-6 2h4" fill="none" stroke="#078665" strokeWidth={1} strokeLinecap="round" />
      <Path d="M5 2.5h5" fill="none" stroke="#FFFDF8" strokeWidth={1} strokeLinecap="round" opacity={0.5} />
      <Path d="M5 2h12l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" fill="none" stroke="#FFFDF8" strokeWidth={1.2} strokeLinejoin="round" />
    </G>
  ),
  // Use a conventional eight-tooth silhouette so the clay Options icon reads as a gear.
  options: (
    <G>
      <Path
        d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.05 7.05 0 0 0-1.63-.95l-.36-2.54a.48.48 0 0 0-.49-.41h-3.84a.48.48 0 0 0-.49.41l-.36 2.54c-.59.24-1.13.56-1.63.95l-2.39-.96a.48.48 0 0 0-.61.22L2.65 8.14a.49.49 0 0 0 .12.64L4.8 10.36c-.05.31-.08.62-.08.94s.03.63.08.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96c.5.39 1.04.71 1.63.95l.36 2.54c.04.24.24.41.49.41h3.84c.25 0 .45-.17.49-.41l.36-2.54a7.05 7.05 0 0 0 1.63-.95l2.39.96a.5.5 0 0 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58z"
        fill="#006B73"
        transform="translate(0 0.7)"
      />
      <Path
        d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.05 7.05 0 0 0-1.63-.95l-.36-2.54a.48.48 0 0 0-.49-.41h-3.84a.48.48 0 0 0-.49.41l-.36 2.54c-.59.24-1.13.56-1.63.95l-2.39-.96a.48.48 0 0 0-.61.22L2.65 8.14a.49.49 0 0 0 .12.64L4.8 10.36c-.05.31-.08.62-.08.94s.03.63.08.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96c.5.39 1.04.71 1.63.95l.36 2.54c.04.24.24.41.49.41h3.84c.25 0 .45-.17.49-.41l.36-2.54a7.05 7.05 0 0 0 1.63-.95l2.39.96a.5.5 0 0 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58z"
        fill="#008897"
      />
      <Circle cx={12} cy={12} r={3.4} fill="#24382B" />
      <Circle cx={12} cy={12} r={1.8} fill="#FFFDF8" />
    </G>
  ),
  // A raised plum close mark keeps modal dismissal within this app's clay icon set.
  close: (
    <G>
      <Circle cx={12} cy={13} r={10.5} fill="#2B1A22" />
      <Circle cx={12} cy={11.5} r={10.5} fill="#38242E" />
      <Path d="m8.5 8 7 7m0-7-7 7" fill="none" stroke="#FFFDF8" strokeWidth={2.2} strokeLinecap="round" />
    </G>
  ),
  // Removing list membership keeps history, so use a list-minus rather than a close or trash mark.
  removeHabit: (
    <G>
      <Rect x={3} y={4} width={14} height={18} rx={3} fill="#2B1A22" />
      <Rect x={3} y={2.5} width={14} height={18} rx={3} fill="#38242E" />
      <Path d="M6 7h7M6 11h5M6 15h3" fill="none" stroke="#FFFDF8" strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={17} cy={17.5} r={6} fill="#006B73" />
      <Circle cx={17} cy={16.5} r={6} fill="#008897" />
      <Path d="M14 16.5h6" stroke="#FFFDF8" strokeWidth={2} strokeLinecap="round" />
      <Path d="M5 4h7" stroke="#FFFDF8" strokeWidth={1} strokeLinecap="round" opacity={0.35} />
    </G>
  ),
  add: (
    <G>
      <Circle cx={12} cy={13} r={10.5} fill="#006B73" />
      <Circle cx={12} cy={11.5} r={10.5} fill="#008897" />
      <Path d="M12 7.5v8m-4-4h8" fill="none" stroke="#FFFDF8" strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M5 7.5a8 8 0 0 1 5-3" fill="none" stroke="#FFFDF8" strokeWidth={1} strokeLinecap="round" opacity={0.4} />
    </G>
  ),
  import: (
    <G>
      <Rect x={3.5} y={4} width={17} height={18} rx={2.5} fill="#D7D1C8" />
      <Rect x={3.5} y={3} width={17} height={18} rx={2.5} fill="#FFFDF8" />
      <Path d="M15 3l5 5h-5z" fill="#008897" />
      <Path d="M15 3v5h5" fill="none" stroke="#006B73" strokeWidth={1} strokeLinejoin="round" />
      <Path d="M5 16h4l2 2h2l2-2h4v3H5z" fill="#24382B" />
      <Path d="M12.6 5.5v8m-3-3 3 3 3-3" fill="none" stroke="#05694F" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 5v8m-3-3 3 3 3-3" fill="none" stroke="#078665" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </G>
  ),
  export: (
    <G>
      <Rect x={3.5} y={4} width={17} height={18} rx={2.5} fill="#D7D1C8" />
      <Rect x={3.5} y={3} width={17} height={18} rx={2.5} fill="#FFFDF8" />
      <Path d="M15 3l5 5h-5z" fill="#008897" />
      <Path d="M15 3v5h5" fill="none" stroke="#006B73" strokeWidth={1} strokeLinejoin="round" />
      <Path d="M5 16h4l2 2h2l2-2h4v3H5z" fill="#24382B" />
      <Path d="M12.6 14V6m-3 3 3-3 3 3" fill="none" stroke="#05694F" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 14V6m-3 3 3-3 3 3" fill="none" stroke="#078665" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </G>
  ),
  calendar: (
    <G>
      <Rect x={3} y={5} width={18} height={17} rx={3} fill="#2B1A22" />
      <Rect x={3} y={3} width={18} height={17} rx={3} fill="#38242E" />
      <Path d="M3 9h18" stroke="#FFFDF8" strokeWidth={1.4} />
      <Path d="M8 2v4m8-4v4" stroke="#FFFDF8" strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M7 12h2m3 0h2m3 0h2M7 16h2m3 0h2" stroke="#FFFDF8" strokeWidth={1.4} strokeLinecap="round" opacity={0.9} />
    </G>
  ),
  chevronDown: (
    <G>
      <Path d="m6 9 6 6 6-6" fill="none" stroke="#05694F" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="m6 7.5 6 6 6-6" fill="none" stroke="#078665" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </G>
  ),
  chevronUp: (
    <G>
      <Path d="m6 15 6-6 6 6" fill="none" stroke="#05694F" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="m6 13.5 6-6 6 6" fill="none" stroke="#078665" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </G>
  ),
  chevronLeft: (
    <G>
      <Path d="m15 5-7 7 7 7" fill="none" stroke="#05694F" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="m13.5 5-7 7 7 7" fill="none" stroke="#078665" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </G>
  ),
  chevronRight: (
    <G>
      <Path d="m9 5 7 7-7 7" fill="none" stroke="#05694F" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="m10.5 5 7 7-7 7" fill="none" stroke="#078665" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </G>
  ),
};

// Folded clay documents and opposing arrows clarify the JSON actions.
export function SectionIcon({ name, size = 22 }: SectionIconProps) {
  // Reuse the approved character artwork at every requested section icon size.
  if (name === "chores" || name === "expenses" || name === "shopping" || name === "dashboard") {
    const character = name === "dashboard" ? DASHBOARD_CHARACTER : name === "chores" ? CHORE_CHARACTER : name === "expenses" ? EXPENSE_CHARACTER : SHOPPING_CHARACTER;
    return <Image accessible={false} pointerEvents="none" resizeMode="contain" source={character} style={{ width: size, height: size, flexShrink: 0 }} />;
  }
  // Each half of the transparent artwork supplies one character without changing icon sizing.
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
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {ICONS[name]}
    </Svg>
  );
}
