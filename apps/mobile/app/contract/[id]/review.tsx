import { useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, ErrorState, LoadingState, StarRating, TextField } from "../../../components";
import { useContract } from "../../../features";
import { useCreateReview } from "../../../features/reviews";
import { useAuthStore } from "../../../lib";

export default function LeaveReview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const contractQuery = useContract(id);
  const createReview = useCreateReview();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  if (contractQuery.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (contractQuery.isError || !contractQuery.data) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <ErrorState
          message="Couldn't load this contract."
          onRetry={() => contractQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  const contract = contractQuery.data;
  const isClient = contract.clientId === user?.id;

  const onSubmit = async () => {
    await createReview.mutateAsync({
      contractId: contract.id,
      rating,
      comment: comment || undefined,
    });
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 gap-6 px-6 py-6">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-ink">Rate & Review</Text>
          <Text className="text-sm font-medium text-muted" onPress={() => router.back()}>
            Cancel
          </Text>
        </View>

        <Text className="text-sm text-muted">
          {isClient
            ? "How was working with this professional?"
            : "How was working with this client?"}
        </Text>

        <View className="items-center gap-2 py-4">
          <StarRating rating={rating} size={36} onChange={setRating} />
        </View>

        <TextField
          label="Comment (optional)"
          multiline
          numberOfLines={4}
          value={comment}
          onChangeText={setComment}
        />

        {createReview.isError ? (
          <Text className="text-sm text-outgoing">Could not submit your review. Try again.</Text>
        ) : null}

        <Button
          label="Submit Review"
          onPress={onSubmit}
          disabled={rating === 0}
          loading={createReview.isPending}
        />
      </View>
    </SafeAreaView>
  );
}
