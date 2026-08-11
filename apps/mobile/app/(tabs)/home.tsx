import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ActionItem } from "@buildtrust/shared";
import {
  Avatar,
  BudgetBar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  ProjectCard,
} from "../../components";
import { useActionItems, useApproveMilestone, useHomeSummary, useProjects } from "../../features";
import { formatMoney, useAuthStore } from "../../lib";
import { colors } from "../../theme/tokens";

function ActionItemRow({ item }: { item: ActionItem }) {
  const router = useRouter();
  const approveMilestone = useApproveMilestone();

  if (item.kind === "milestone_approval") {
    return (
      <Card>
        <Text className="text-sm font-medium text-ink">{item.projectTitle}</Text>
        <Text className="mt-0.5 text-xs text-muted">{item.milestoneTitle}</Text>
        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-ink">{formatMoney(item.amount)}</Text>
          <View className="w-28">
            <Button
              label="Review"
              onPress={() => approveMilestone.mutate(item.milestoneId)}
              loading={approveMilestone.isPending}
            />
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card>
      <Text className="text-sm font-medium text-ink">{item.projectTitle}</Text>
      <Text className="mt-0.5 text-xs text-muted">Escrow deposit needed</Text>
      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-ink">{formatMoney(item.amountDue)}</Text>
        <View className="w-28">
          <Button
            label="Fund"
            variant="outline"
            onPress={() => router.push(`/project/${item.projectId}?tab=Payments`)}
          />
        </View>
      </View>
    </Card>
  );
}

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const projectsQuery = useProjects();
  const summaryQuery = useHomeSummary();
  const actionItemsQuery = useActionItems();

  const isLoading = projectsQuery.isPending || summaryQuery.isPending || actionItemsQuery.isPending;
  const isError = projectsQuery.isError || summaryQuery.isError || actionItemsQuery.isError;
  const refreshing =
    projectsQuery.isRefetching || summaryQuery.isRefetching || actionItemsQuery.isRefetching;

  const onRefresh = () => {
    projectsQuery.refetch();
    summaryQuery.refetch();
    actionItemsQuery.refetch();
  };

  const firstName = user?.fullName.split(" ")[0] ?? "";

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="gap-3 px-6 pb-2 pt-6">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm text-muted">Welcome back,</Text>
            <Text className="text-2xl font-bold text-ink">{firstName}</Text>
          </View>
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => Alert.alert("Notifications", "Coming soon.")} hitSlop={8}>
              <Ionicons name="notifications-outline" size={24} color={colors.ink} />
            </Pressable>
            <Pressable onPress={() => router.push("/settings")}>
              <Avatar name={user?.fullName ?? ""} imageUrl={user?.avatarUrl} size={40} />
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={() => router.push("/(tabs)/discover")}
          className="flex-row items-center gap-2 rounded-xl border border-border bg-background-alt px-4 py-3"
        >
          <Ionicons name="search-outline" size={16} color={colors.muted} />
          <Text className="text-sm text-muted">Search professionals or specialties</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Couldn't load your dashboard." onRetry={onRefresh} />
      ) : (
        <ScrollView
          contentContainerClassName="gap-6 px-6 py-6"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View className="gap-3">
            <View className="flex-row items-center gap-2">
              <Text className="text-lg font-semibold text-ink">Action Required</Text>
              {actionItemsQuery.data && actionItemsQuery.data.length > 0 ? (
                <View className="h-5 min-w-[20px] items-center justify-center rounded-full bg-outgoing px-1.5">
                  <Text className="text-xs font-semibold text-white">
                    {actionItemsQuery.data.length}
                  </Text>
                </View>
              ) : null}
            </View>

            {actionItemsQuery.data && actionItemsQuery.data.length === 0 ? (
              <EmptyState message="You're all caught up." />
            ) : (
              <View className="gap-3">
                {actionItemsQuery.data?.map((item) => (
                  <ActionItemRow
                    key={item.kind === "milestone_approval" ? item.milestoneId : item.contractId}
                    item={item}
                  />
                ))}
              </View>
            )}
          </View>

          <View className="gap-3">
            <Text className="text-lg font-semibold text-ink">Budget Overview</Text>
            <Card>
              {summaryQuery.data ? (
                <>
                  <BudgetBar
                    released={summaryQuery.data.released}
                    inEscrow={summaryQuery.data.inEscrow}
                    remaining={summaryQuery.data.remaining}
                  />
                  <View className="mt-4 flex-row flex-wrap gap-y-3">
                    <View className="w-1/2">
                      <Text className="text-xs text-muted">Released</Text>
                      <Text className="text-base font-semibold text-ink">
                        {formatMoney(summaryQuery.data.released)}
                      </Text>
                    </View>
                    <View className="w-1/2">
                      <Text className="text-xs text-muted">In Escrow</Text>
                      <Text className="text-base font-semibold text-ink">
                        {formatMoney(summaryQuery.data.inEscrow)}
                      </Text>
                    </View>
                    <View className="w-1/2">
                      <Text className="text-xs text-muted">Remaining</Text>
                      <Text className="text-base font-semibold text-ink">
                        {formatMoney(summaryQuery.data.remaining)}
                      </Text>
                    </View>
                    <View className="w-1/2">
                      <Text className="text-xs text-muted">Committed</Text>
                      <Text className="text-base font-semibold text-ink">
                        {formatMoney(summaryQuery.data.committed)}
                      </Text>
                    </View>
                  </View>
                  <Text
                    className="mt-4 text-sm font-medium text-accent"
                    onPress={() => router.push("/(tabs)/wallet")}
                  >
                    View wallet
                  </Text>
                </>
              ) : null}
            </Card>
          </View>

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-ink">My Projects</Text>
              <Text
                className="text-sm font-medium text-accent"
                onPress={() => router.push("/(tabs)/projects")}
              >
                See all
              </Text>
            </View>

            <Button label="New Project" onPress={() => router.push("/project/new")} />

            {projectsQuery.data && projectsQuery.data.length === 0 ? (
              <EmptyState message="No projects yet. Start your first one above." />
            ) : (
              <View className="gap-3">
                {projectsQuery.data?.slice(0, 5).map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
