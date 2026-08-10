import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button, EmptyState, ErrorState, LoadingState, ProjectCard } from "../../components";
import { useProjects } from "../../features";

export default function Projects() {
  const router = useRouter();
  const projectsQuery = useProjects();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-6 pb-2 pt-6">
        <Text className="text-2xl font-bold text-ink">Projects</Text>
        <Button label="New Project" onPress={() => router.push("/project/new")} />
      </View>

      {projectsQuery.isPending ? (
        <LoadingState />
      ) : projectsQuery.isError ? (
        <ErrorState
          message="Couldn't load your projects."
          onRetry={() => projectsQuery.refetch()}
        />
      ) : projectsQuery.data.length === 0 ? (
        <EmptyState message="No projects yet. Tap New Project to start one." />
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
