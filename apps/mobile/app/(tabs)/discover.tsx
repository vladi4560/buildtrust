import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ProfessionalSort } from "@buildtrust/shared";
import {
  CategoryTile,
  EmptyState,
  ErrorState,
  LoadingState,
  ProCard,
  TextField,
} from "../../components";
import { useCategories, useProfessionals } from "../../features";
import { useDebouncedValue } from "../../lib";

const CHIPS = ["All", "Top rated", "Nearby", "Available"] as const;
type Chip = (typeof CHIPS)[number];

const CHIP_SORT: Record<Chip, ProfessionalSort | undefined> = {
  All: undefined,
  "Top rated": "rating",
  Nearby: "distance",
  Available: undefined,
};

export default function Discover() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [chip, setChip] = useState<Chip>("Top rated");

  const categoriesQuery = useCategories();
  const professionalsQuery = useProfessionals({
    search: debouncedSearch || undefined,
    sort: CHIP_SORT[chip],
  });

  const isSearching = debouncedSearch.trim().length > 0;
  const results =
    chip === "Available"
      ? professionalsQuery.data?.filter((p) => p.available)
      : professionalsQuery.data;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="gap-4 px-6 pb-2 pt-6">
        <Text className="text-2xl font-bold text-ink">Discover</Text>
        <TextField
          label="Search"
          placeholder="Search professionals or specialties"
          value={search}
          onChangeText={setSearch}
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CHIPS}
          keyExtractor={(item) => item}
          contentContainerClassName="gap-2"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setChip(item)}
              className={`rounded-full border px-4 py-2 ${
                chip === item ? "border-primary bg-primary" : "border-border bg-white"
              }`}
            >
              <Text className={`text-sm font-medium ${chip === item ? "text-white" : "text-ink"}`}>
                {item}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {professionalsQuery.isPending ? (
        <LoadingState />
      ) : professionalsQuery.isError ? (
        <ErrorState
          message="Couldn't load professionals."
          onRetry={() => professionalsQuery.refetch()}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-4 px-6 pb-6"
          refreshing={professionalsQuery.isRefetching}
          onRefresh={() => professionalsQuery.refetch()}
          ListHeaderComponent={
            !isSearching ? (
              <View className="gap-4 pb-2">
                <View>
                  <Text className="mb-3 text-lg font-semibold text-ink">Browse by Trade</Text>
                  {categoriesQuery.isPending ? (
                    <LoadingState />
                  ) : categoriesQuery.isError ? (
                    <ErrorState
                      message="Couldn't load categories."
                      onRetry={() => categoriesQuery.refetch()}
                    />
                  ) : (
                    <View className="flex-row flex-wrap justify-between gap-y-3">
                      {categoriesQuery.data?.map((category) => (
                        <CategoryTile key={category.id} category={category} />
                      ))}
                    </View>
                  )}
                </View>
                <Text className="text-lg font-semibold text-ink">Top Rated Near You</Text>
              </View>
            ) : (
              <Text className="pb-2 text-lg font-semibold text-ink">Search Results</Text>
            )
          }
          ListEmptyComponent={
            <EmptyState
              message={
                isSearching ? "No professionals match your search." : "No professionals yet."
              }
            />
          }
          renderItem={({ item }) => <ProCard professional={item} />}
        />
      )}
    </SafeAreaView>
  );
}
