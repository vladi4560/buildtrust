import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Avatar,
  EmptyState,
  ErrorState,
  LoadingState,
  RatingBreakdown,
  StarRating,
} from "../../components";
import { useUserReviews } from "../../features";

export default function Reviews() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const reviewsQuery = useUserReviews(userId);

  if (reviewsQuery.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (reviewsQuery.isError || !reviewsQuery.data) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <ErrorState message="Couldn't load reviews." onRetry={() => reviewsQuery.refetch()} />
      </SafeAreaView>
    );
  }

  const { average, count, breakdown, reviews } = reviewsQuery.data;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-4 px-6 py-6"
        ListHeaderComponent={
          <View className="mb-2 gap-5">
            <Text className="text-sm font-medium text-muted" onPress={() => router.back()}>
              Back
            </Text>
            <View className="items-center gap-1">
              <Text className="text-5xl font-bold text-ink">{average.toFixed(1)}</Text>
              <StarRating rating={average} />
              <Text className="text-sm text-muted">{count} reviews</Text>
            </View>
            <RatingBreakdown breakdown={breakdown} />
          </View>
        }
        ListEmptyComponent={<EmptyState message="No reviews yet." />}
        renderItem={({ item }) => (
          <View className="gap-2 border-b border-border pb-4">
            <View className="flex-row items-center gap-3">
              <Avatar name={item.author.fullName} imageUrl={item.author.avatarUrl} size={36} />
              <View className="flex-1">
                <Text className="text-sm font-medium text-ink">{item.author.fullName}</Text>
                <Text className="text-xs text-muted">
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <StarRating rating={item.rating} size={14} />
            </View>
            {item.comment ? <Text className="text-sm text-muted">{item.comment}</Text> : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}
