import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button, Card, EmptyState, ErrorState, LoadingState, ProjectCard } from "../../components";
import { useProjects, useWallet } from "../../features";
import { formatMoney, useAuthStore } from "../../lib";

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const projectsQuery = useProjects();
  const walletQuery = useWallet();

  const isLoading = projectsQuery.isPending || walletQuery.isPending;
  const isError = projectsQuery.isError || walletQuery.isError;
  const refreshing = projectsQuery.isRefetching || walletQuery.isRefetching;

  const onRefresh = () => {
    projectsQuery.refetch();
    walletQuery.refetch();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Couldn't load your dashboard." onRetry={onRefresh} />
      ) : (
        <ScrollView
          contentContainerClassName="gap-6 px-6 py-6"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View>
            <Text className="text-sm text-muted">Welcome back,</Text>
            <Text className="text-2xl font-bold text-ink">{user?.fullName}</Text>
          </View>

          <Card onPress={() => router.push("/(tabs)/wallet")}>
            <Text className="text-sm text-muted">Escrow balance</Text>
            <Text className="mt-1 text-3xl font-bold text-ink">
              {formatMoney(walletQuery.data?.balance ?? 0, { decimals: true })}
            </Text>
          </Card>

          {user?.role === "CLIENT" ? (
            <Button
              label="Find a Professional"
              variant="outline"
              onPress={() => router.push("/professionals")}
            />
          ) : null}

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-ink">Your Projects</Text>
              <Button label="New Project" onPress={() => router.push("/project/new")} />
            </View>

            {projectsQuery.data && projectsQuery.data.length === 0 ? (
              <EmptyState message="No projects yet. Start your first one above." />
            ) : (
              <View className="gap-3">
                {projectsQuery.data?.map((project) => (
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
