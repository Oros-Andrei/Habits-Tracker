import type { ReactNode } from "react";
import { Circle, G, Path, Rect, Svg } from "react-native-svg";
import type { TabId } from "../Resources/types";

export type SectionIconName =
  | TabId
  | "add"
  | "close"
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

const ICONS: Record<SectionIconName, ReactNode> = {
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
  dashboard: (
    <G>
      <Rect x={3} y={4} width={8} height={8} rx={2} fill="#006B73" />
      <Rect x={13} y={4} width={8} height={8} rx={2} fill="#05694F" />
      <Rect x={3} y={14} width={8} height={8} rx={2} fill="#2B1A22" />
      <Rect x={13} y={14} width={8} height={8} rx={2} fill="#1B2D24" />
      <Rect x={3} y={3} width={8} height={8} rx={2} fill="#008897" />
      <Rect x={13} y={3} width={8} height={8} rx={2} fill="#078665" />
      <Rect x={3} y={13} width={8} height={8} rx={2} fill="#38242E" />
      <Rect x={13} y={13} width={8} height={8} rx={2} fill="#24382B" />
      <Path d="M4.5 4.5h4" stroke="#FFFDF8" strokeWidth={1} strokeLinecap="round" opacity={0.45} />
      <Path d="M14.5 4.5h4" stroke="#FFFDF8" strokeWidth={1} strokeLinecap="round" opacity={0.45} />
    </G>
  ),
  goodHabits: (
    <G>
      <Circle cx={12} cy={13} r={8.5} fill="#05694F" />
      <Circle cx={12} cy={11} r={8.5} fill="#078665" />
      <Path d="M6.7 7.5a7 7 0 0 1 8.8-2" fill="none" stroke="#FFFDF8" strokeWidth={1.2} strokeLinecap="round" opacity={0.4} />
      <Path d="m7.5 11.2 3 3 6-6.4" fill="none" stroke="#FFFDF8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </G>
  ),
  badHabits: (
    <G>
      <Circle cx={12} cy={13} r={8.5} fill="#2B1A22" />
      <Circle cx={12} cy={11} r={8.5} fill="#38242E" />
      <Path d="M6.7 7.5a7 7 0 0 1 8.8-2" fill="none" stroke="#FFFDF8" strokeWidth={1.2} strokeLinecap="round" opacity={0.3} />
      <Path d="m9 8 6 6m0-6-6 6" fill="none" stroke="#FFFDF8" strokeWidth={2.5} strokeLinecap="round" />
    </G>
  ),
  expenses: (
    <G>
      <Path d="M4 8h14a2 2 0 0 1 2 2v8H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 1-2Z" fill="#006B73" />
      <Path d="M4 7h14a2 2 0 0 1 2 2v8H5a2 2 0 0 1-2-2V9a2 2 0 0 1 1-2Z" fill="#008897" />
      <Path d="M5 8.5h11" stroke="#FFFDF8" strokeWidth={1} strokeLinecap="round" opacity={0.42} />
      <Circle cx={16.5} cy={14} r={4} fill="#05694F" />
      <Circle cx={16.5} cy={13} r={4} fill="#078665" />
      <Path d="M15 13h3" stroke="#FFFDF8" strokeWidth={1.2} strokeLinecap="round" />
    </G>
  ),
  chores: (
    <G>
      <Rect x={4} y={4} width={16} height={18} rx={2.5} fill="#1B2D24" />
      <Rect x={4} y={3} width={16} height={18} rx={2.5} fill="#24382B" />
      <Path d="m7 8 1.2 1.2L10 7.4m2.5 1h4" fill="none" stroke="#FFFDF8" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="m7 13 1.2 1.2 1.8-1.8m2.5 1h4" fill="none" stroke="#FFFDF8" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 17h9" fill="none" stroke="#FFFDF8" strokeWidth={1.5} strokeLinecap="round" opacity={0.75} />
      <Path d="M6 4.5h9" fill="none" stroke="#FFFDF8" strokeWidth={1} strokeLinecap="round" opacity={0.35} />
    </G>
  ),
  shopping: (
    <G>
      <Path d="M8 9V6a4 4 0 0 1 8 0v3" fill="none" stroke="#006B73" strokeWidth={3} strokeLinecap="round" />
      <Path d="M4 10h16l-1.5 10h-13L4 10Z" fill="#006B73" />
      <Path d="M8 9V6a4 4 0 0 1 8 0v3" fill="none" stroke="#FFFDF8" strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M4 9h16l-1.5 10h-13L4 9Z" fill="#008897" />
      <Path d="M9 12v5m3-5v5m3-5v5" fill="none" stroke="#FFFDF8" strokeWidth={1.6} strokeLinecap="round" opacity={0.85} />
      <Path d="M6 10.5h12" fill="none" stroke="#FFFDF8" strokeWidth={1} strokeLinecap="round" opacity={0.4} />
    </G>
  ),
};

// Folded clay documents and opposing arrows clarify the JSON actions.
export function SectionIcon({ name, size = 22 }: SectionIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {ICONS[name]}
    </Svg>
  );
}
