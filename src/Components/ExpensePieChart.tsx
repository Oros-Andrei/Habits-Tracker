import { StyleSheet, Text, View } from "react-native";
import { Circle, Path, Svg } from "react-native-svg";
import { categorySpending, formatLei } from "../Resources/expenseLedger";
import { COLORS } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";
import type { ExpenseRecord } from "../Resources/types";

// Use the existing SVG dependency for a local category pie with a readable text legend.
export function ExpensePieChart({ records }: { records: ExpenseRecord[] }) {
  const groups = categorySpending(records);
  const total = groups.reduce((sum, item) => sum + item.amountBani, 0);
  let angle = -Math.PI / 2;
  return <View style={styles.chart}>
    {/* View handles native accessibility props without forwarding them as invalid SVG attributes on web. */}
    <View accessible accessibilityRole="image" accessibilityLabel={`Spending by category: ${groups.map((item) => `${item.name} ${formatLei(item.amountBani)}`).join(", ") || "No payments"}`}>
    <Svg width="100%" height={230} viewBox="0 0 240 240">
      {!total ? <Circle cx={120} cy={120} r={104} fill={COLORS.mutedSurface} /> : groups.map((group) => {
        if (groups.length === 1) return <Circle key={group.id} cx={120} cy={120} r={104} fill={group.color} />;
        const start = angle; angle += group.amountBani / total * Math.PI * 2;
        const x1 = 120 + 104 * Math.cos(start), y1 = 120 + 104 * Math.sin(start);
        const x2 = 120 + 104 * Math.cos(angle), y2 = 120 + 104 * Math.sin(angle);
        return <Path key={group.id} d={`M120 120 L${x1} ${y1} A104 104 0 ${angle - start > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`}
          fill={group.color} stroke={COLORS.surface} strokeWidth={2} />;
      })}
    </Svg>
    </View>
    <Text style={styles.total}>{formatLei(total)} spent</Text>
    {groups.length ? groups.map((group) => <View key={group.id} style={styles.legend}>
      <View style={[styles.dot, { backgroundColor: group.color }]} />
      <Text style={styles.name}>{group.name}</Text>
      <Text style={styles.amount}>{formatLei(group.amountBani)} · {Math.round(group.amountBani / total * 100)}%</Text>
    </View>) : <Text style={styles.note}>Your category chart appears when you record a payment.</Text>}
  </View>;
}
const styles = StyleSheet.create({
  chart: { gap: 10 }, total: { color: COLORS.primary, textAlign: "center", fontFamily: FONT_FAMILY.bold, fontSize: 17 },
  legend: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 }, dot: { borderRadius: 6, width: 12, height: 12 },
  name: { color: COLORS.primary, flex: 1, fontFamily: FONT_FAMILY.medium, fontSize: 14 },
  amount: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 13 },
  note: { color: COLORS.mutedText, fontFamily: FONT_FAMILY.regular, fontSize: 14 },
});
