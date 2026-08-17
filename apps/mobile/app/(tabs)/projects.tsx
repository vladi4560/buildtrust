import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { ProjectStatus } from "@buildtrust/shared";
import { Button, EmptyState, ErrorState, LoadingState, ProjectCard } from "../../components";
import { useProjects } from "../../features";

const FILTERS = ["All", "In Progress", "Planning", "Completed"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_STATUS: Record<Filter, ProjectStatus | undefined> = {
  All: undefined,
  "In Progress": "IN_PROGRESS",
  Planning: "PLANNING",
  Completed: "COMPLETED",
};

export default function Projects() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("All");
  const projectsQuery = useProjects({ status: FILTER_STATUS[filter] });

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="gap-4 px-6 pb-2 pt-6">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-ink">Projects</Text>
          <Button label="+ New" onPress={() => router.push("/project/new")} />
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(item) => item}
          contentContainerClassName="gap-2"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setFilter(item)}
              className={`rounded-full border px-4 py-2 ${
                filter === item ? "border-primary bg-primary" : "border-border bg-white"
              }`}
            >
              <Text
                className={`text-sm font-medium ${filter === item ? "text-white" : "text-ink"}`}
              >
                {item}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {projectsQuery.isPending ? (
        <LoadingState />
      ) : projectsQuery.isError ? (
        <ErrorState
          message="Couldn't load your projects."
          onRetry={() => projectsQuery.refetch()}
        />
      ) : projectsQuery.data.length === 0 ? (
        <EmptyState message="No projects yet. Tap + New to start one." />
      ) : (
        <FlatList
          data={projectsQuery.data}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-3 px-6 py-4"
          refreshing={projectsQuery.isRefetching}
          onRefresh={() => projectsQuery.refetch()}
          renderItem={({ item }) => <ProjectCard project={item} />}
        />
      )}
    </SafeAreaView>
  );
}
