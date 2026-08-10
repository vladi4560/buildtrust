import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState, ErrorState, LoadingState, TransactionRow } from "../../components";
import { useWallet } from "../../features";
import { formatMoney } from "../../lib";

export default function Wallet() {
  const walletQuery = useWallet();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-6 pb-2 pt-6">
        <Text className="text-2xl font-bold text-ink">Wallet</Text>
      </View>

      {walletQuery.isPending ? (
        <LoadingState />
      ) : walletQuery.isError ? (
        <ErrorState message="Couldn't load your wallet." onRetry={() => walletQuery.refetch()} />
      ) : (
        <FlatList
          data={walletQuery.data.transactions}
          keyExtractor={(item) => item.id}
          refreshing={walletQuery.isRefetching}
          onRefresh={() => walletQuery.refetch()}
          contentContainerClassName="px-6 pb-6"
          ListHeaderComponent={
            <View className="mb-6 rounded-2xl border border-border bg-background-alt p-5">
              <Text className="text-sm text-muted">🔒 Escrow balance</Text>
              <Text className="mt-1 text-3xl font-bold text-ink">
                {formatMoney(walletQuery.data.balance, { decimals: true })}
              </Text>
              <Text className="mt-1 text-xs text-muted">
                Held for active contracts, released as milestones are approved.
              </Text>
            </View>
          }
          ListEmptyComponent={<EmptyState message="No transactions yet." />}
          renderItem={({ item }) => <TransactionRow transaction={item} />}
        />
      )}
    </SafeAreaView>
  );
}
