import { Platform, type ViewStyle } from "react-native";

// Match the approved Android cream-clay preview without changing the browser palette.
const android = Platform.OS === "android";

// Shared design tokens keep the Android and browser interfaces visually related.
export const COLORS = {
  primary: "#000000",
  secondary: "#008897",
  gradientGreen: "#078665",
  gradientPlum: "#38242E",
  gradientForest: "#24382B",
  background: android ? "#F6EDE6" : "#F7F3EC",
  surface: android ? "#FFF7EF" : "#FFFDF8",
  mutedSurface: android ? "#E8EEE4" : "#EFF4F0",
  mutedText: "#746E68",
  divider: android ? "#E1D4C8" : "#D7D1C8",
  white: "#FFFFFF",
} as const;

export const GRADIENTS = {
  teal: [COLORS.secondary, COLORS.gradientGreen] as const,
  forest: [COLORS.gradientGreen, COLORS.gradientForest] as const,
  plum: [COLORS.gradientPlum, COLORS.gradientForest] as const,
} as const;

export const SURFACE_SHADOW: ViewStyle = {
  shadowColor: COLORS.gradientPlum,
  shadowOffset: { width: 0, height: 7 },
  shadowOpacity: 0.14,
  shadowRadius: 12,
  elevation: 6,
};

export const SOFT_SHADOW: ViewStyle = {
  shadowColor: COLORS.gradientForest,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.12,
  shadowRadius: 6,
  elevation: 3,
};
