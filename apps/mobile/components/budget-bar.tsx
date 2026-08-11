import { View } from "react-native";
import { colors } from "../theme/tokens";

export interface BudgetBarProps {
  released: number;
  inEscrow: number;
  remaining: number;
}

export function BudgetBar({ released, inEscrow, remaining }: BudgetBarProps) {
  const total = released + inEscrow + remaining;
  const releasedPct = total === 0 ? 0 : (released / total) * 100;
  const inEscrowPct = total === 0 ? 0 : (inEscrow / total) * 100;
  const remainingPct = total === 0 ? 100 : (remaining / total) * 100;

  return (
    <View className="h-2.5 flex-row overflow-hidden rounded-full bg-background-alt">
      <View style={{ width: `${releasedPct}%`, backgroundColor: colors.success }} />
      <View style={{ width: `${inEscrowPct}%`, backgroundColor: colors.primary }} />
      <View style={{ width: `${remainingPct}%`, backgroundColor: colors.border }} />
    </View>
  );
}
