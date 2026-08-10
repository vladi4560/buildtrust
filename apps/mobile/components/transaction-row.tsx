import { Text, View } from "react-native";
import type { Transaction } from "@buildtrust/shared";
import { formatMoney } from "../lib/format-money";

export interface TransactionRowProps {
  transaction: Transaction;
}

export function TransactionRow({ transaction }: TransactionRowProps) {
  const isPositive = transaction.sign === "+";

  return (
    <View className="flex-row items-center justify-between border-b border-border py-3.5">
      <View className="flex-1 pr-3">
        <Text className="text-sm font-medium text-ink">{transaction.label}</Text>
        <Text className="mt-0.5 text-xs text-muted">
          {new Date(transaction.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </Text>
      </View>
      <Text className={`text-sm font-semibold ${isPositive ? "text-success" : "text-outgoing"}`}>
        {transaction.sign}
        {formatMoney(transaction.amount, { decimals: true })}
      </Text>
    </View>
  );
}
