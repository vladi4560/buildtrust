import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Avatar,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  RatingBreakdown,
  StarRating,
} from "../../components";
import {
  useCreateConversation,
  usePortfolio,
  useProfessional,
  useUserReviews,
} from "../../features";
import { useAuthStore } from "../../lib";

const TABS = ["Portfolio", "Reviews"] as const;
type Tab = (typeof TABS)[number];

export default function ProfessionalProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [tab, setTab] = useState<Tab>("Portfolio");

  const professionalQuery = useProfessional(id);
  const portfolioQuery = usePortfolio(id);
  const reviewsQuery = useUserReviews(id);
  const createConversation = useCreateConversation();

  if (professionalQuery.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (professionalQuery.isError || !professionalQuery.data) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <ErrorState
          message="Couldn't load this profile."
          onRetry={() => professionalQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  const pro = professionalQuery.data;
  const isOwnProfile = user?.id === id;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerClassName="gap-5 px-6 py-6">
        <Text className="text-sm font-medium text-muted" onPress={() => router.back()}>
          Back
        </Text>

        <View className="flex-row items-center gap-4">
          <Avatar name={pro.fullName} imageUrl={pro.avatarUrl} size={64} />
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-xl font-bold text-ink">{pro.fullName}</Text>
              {pro.verified ? (
                <Text className="text-xs font-medium text-success">Verified</Text>
              ) : null}
            </View>
            <Text className="text-sm text-muted">{pro.specialty}</Text>
          </View>
        </View>

        <View className="flex-row justify-between rounded-2xl border border-border p-4">
          <View className="items-center">
            <StarRating rating={pro.rating} size={14} />
            <Text className="mt-1 text-xs text-muted">{pro.reviewCount} reviews</Text>
          </View>
          <View className="items-center">
            <Text className="text-base font-semibold text-ink">{pro.onTimePercent}%</Text>
            <Text className="text-xs text-muted">On time</Text>
          </View>
          <View className="items-center">
            <Text className="text-base font-semibold text-ink">{pro.projectsCount}</Text>
            <Text className="text-xs text-muted">Projects</Text>
          </View>
          <View className="items-center">
            <Text className="text-base font-semibold text-ink">{pro.yearsExperience}</Text>
            <Text className="text-xs text-muted">Years</Text>
          </View>
        </View>

        {pro.skills.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {pro.skills.map((skill) => (
              <Chip key={skill} label={skill} />
            ))}
          </View>
        ) : null}

        {pro.bio ? (
          <View>
            <Text className="text-sm font-semibold text-ink">About</Text>
            <Text className="mt-1 text-sm text-muted">{pro.bio}</Text>
          </View>
        ) : null}

        {!isOwnProfile ? (
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                label="Message"
                variant="outline"
                loading={createConversation.isPending}
                onPress={() =>
                  createConversation.mutate(
                    { participantId: pro.id },
                    {
                      onSuccess: (conversation) =>
                        router.push({
                          pathname: "/messages/[id]",
                          params: {
                            id: conversation.id,
                            otherName: conversation.otherParticipant.fullName,
                            otherAvatarUrl: conversation.otherParticipant.avatarUrl ?? "",
                            projectId: conversation.project?.id ?? "",
                            projectTitle: conversation.project?.title ?? "",
                          },
                        }),
                    },
                  )
                }
              />
            </View>
            <View className="flex-1">
              <Button
                label="Hire Me"
                onPress={() => router.push(`/contract/new?professionalId=${id}`)}
              />
            </View>
          </View>
        ) : null}

        <View className="flex-row border-b border-border">
          {TABS.map((t) => (
            <Text
              key={t}
              onPress={() => setTab(t)}
              className={`mr-6 pb-3 text-sm font-medium ${
                tab === t ? "border-b-2 border-primary text-ink" : "text-muted"
              }`}
            >
              {t}
            </Text>
          ))}
        </View>

        {tab === "Portfolio" ? (
          portfolioQuery.isPending ? (
            <LoadingState />
          ) : portfolioQuery.data && portfolioQuery.data.length === 0 ? (
            <EmptyState message="No portfolio items yet." />
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {portfolioQuery.data?.map((item) => (
                <Image
                  key={item.id}
                  source={{ uri: item.imageUrl }}
                  className="rounded-xl"
                  style={{ width: "31.5%", aspectRatio: 1 }}
                />
              ))}
            </View>
          )
        ) : null}

        {tab === "Reviews" ? (
          reviewsQuery.isPending ? (
            <LoadingState />
          ) : reviewsQuery.data && reviewsQuery.data.count === 0 ? (
            <EmptyState message="No reviews yet." />
          ) : reviewsQuery.data ? (
            <View className="gap-4">
              <Text
                className="text-sm font-medium text-accent"
                onPress={() => router.push(`/reviews/${id}`)}
              >
                See all reviews
              </Text>
              <RatingBreakdown breakdown={reviewsQuery.data.breakdown} />
            </View>
          ) : null
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
