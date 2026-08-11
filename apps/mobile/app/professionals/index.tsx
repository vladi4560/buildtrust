import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  ProfessionalCard,
  TextField,
} from "../../components";
import { useProfessionals } from "../../features";

export default function BrowseProfessionals() {
  const router = useRouter();
  const [skill, setSkill] = useState("");
  const professionalsQuery = useProfessionals(skill ? { skill } : undefined);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="gap-4 px-6 pb-2 pt-6">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-ink">Find a Professional</Text>
          <Text className="text-sm font-medium text-muted" onPress={() => router.back()}>
            Back
          </Text>
        </View>
        <TextField
          label="Search by skill"
          placeholder="e.g. Parquet, Painting"
          value={skill}
          onChangeText={setSkill}
        />
      </View>

      {professionalsQuery.isPending ? (
        <LoadingState />
      ) : professionalsQuery.isError ? (
        <ErrorState
          message="Couldn't load professionals."
          onRetry={() => professionalsQuery.refetch()}
        />
      ) : professionalsQuery.data.length === 0 ? (
        <EmptyState message="No professionals match that search." />
      ) : (
        <FlatList
          data={professionalsQuery.data}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-3 px-6 py-4"
          refreshing={professionalsQuery.isRefetching}
          onRefresh={() => professionalsQuery.refetch()}
          renderItem={({ item }) => <ProfessionalCard professional={item} />}
        />
      )}
    </SafeAreaView>
  );
}
