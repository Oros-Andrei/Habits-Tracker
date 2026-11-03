import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { SectionIcon } from "./SectionIcon";
import { COLORS, GRADIENTS, SURFACE_SHADOW } from "../Resources/theme";
import type { StatMetric } from "../Resources/types";
import { FONT_FAMILY } from "../Resources/typography";

type StatCardProps = {
  title: string;
  metrics: StatMetric[];
  tone: "teal" | "forest";
};

// Dashboard cards reuse the clay section icons to pair totals with clear visual cues.
export function StatCard({ title, metrics, tone }: StatCardProps) {
  return (
    <View style={[styles.card, SURFACE_SHADOW]}>
      <LinearGradient colors={GRADIENTS[tone]} style={styles.titlePill}>
        <Text style={styles.title}>{title}</Text>
      </LinearGradient>
      <View style={styles.metrics}>
        {metrics.map((metric, index) => (
          <View
            accessibilityLabel={`${metric.label}: ${metric.value}`}
            key={metric.id}
            style={[styles.metric, index > 0 && styles.metricBorder]}
          >
            <View style={styles.iconSlot}>
              <SectionIcon name={metric.icon} size={48} />
            </View>
            <Text numberOfLines={1} style={styles.value}>{metric.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderColor: "#F1EBE2",
    borderBottomColor: "#E6DED3",
    borderBottomWidth: 2,
    borderRadius: 26,
    borderWidth: 1,
    flex: 1,
    minWidth: 280,
    padding: 20,
  },
  titlePill: {
    alignSelf: "flex-start",
    borderRadius: 18,
    marginBottom: 24,
    minWidth: 190,
    paddingHorizontal: 22,
    paddingVertical: 9,
  },
  // Use shared Nunito faces for dashboard labels and figures.
  title: { color: COLORS.white, fontFamily: FONT_FAMILY.extraBold, fontSize: 22 },
  metrics: { flexDirection: "row", width: "100%" },
  metric: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: 5,
  },
  metricBorder: { borderLeftColor: COLORS.divider, borderLeftWidth: 1 },
  iconSlot: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    minHeight: 48,
    width: 48,
  },
  value: { color: COLORS.primary, fontFamily: FONT_FAMILY.extraBold, fontSize: 22 },
});
