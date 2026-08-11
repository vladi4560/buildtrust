import type { GestureResponderEvent } from "react-native";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { ProjectSummary } from "@buildtrust/shared";
import { formatMoney } from "../lib/format-money";
import { Avatar } from "./avatar";
import { Card } from "./card";
import { ProgressBar } from "./progress-bar";
import { StarRating } from "./star-rating";
import { ProjectStatusBadge } from "./status-badge";

export interface ProjectCardProps {
  project: ProjectSummary;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter();

  return (
    <Card onPress={() => router.push(`/project/${project.id}`)}>
      <View className="flex-row items-start justify-between gap-2">
        <Text className="flex-1 text-base font-semibold text-ink">{project.title}</Text>
        <ProjectStatusBadge status={project.status} />
      </View>
      {project.sizeLabel ? (
        <Text className="mt-1 text-sm text-muted">{project.sizeLabel}</Text>
      ) : null}

      {project.contractor ? (
        <View className="mt-3 flex-row items-center gap-2">
          <Avatar
            name={project.contractor.fullName}
            imageUrl={project.contractor.avatarUrl}
            size={28}
          />
          <Text className="flex-1 text-sm text-ink" numberOfLines={1}>
            {project.contractor.fullName}
          </Text>
          <StarRating rating={project.contractor.rating} size={12} />
        </View>
      ) : (
        <Pressable
          onPress={(event: GestureResponderEvent) => {
            event.stopPropagation();
            router.push("/(tabs)/discover");
          }}
          className="mt-3 flex-row items-center justify-between rounded-xl bg-background-alt px-3 py-2"
        >
          <Text className="text-sm text-muted">No pro hired yet</Text>
          <Text className="text-sm font-medium text-accent">Find a professional</Text>
        </Pressable>
      )}

      {project.nextMilestone ? (
        <View className="mt-3 flex-row items-center justify-between">
          <Text className="flex-1 text-xs text-muted" numberOfLines={1}>
            Next: {project.nextMilestone.title}
          </Text>
          {project.nextMilestone.dueDate ? (
            <Text className="text-xs font-medium text-muted">
              Due {new Date(project.nextMilestone.dueDate).toLocaleDateString()}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View className="mt-3">
        <ProgressBar percent={project.progressPercent} />
        <View className="mt-1.5 flex-row justify-between">
          <Text className="text-xs text-muted">
            {formatMoney(project.spent)} of {formatMoney(project.budgetPlanned)}
          </Text>
          <Text className="text-xs font-medium text-muted">
            {Math.round(project.progressPercent)}%
          </Text>
        </View>
      </View>
    </Card>
  );
}
