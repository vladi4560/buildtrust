import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { ProjectSummary } from "@buildtrust/shared";
import { formatMoney } from "../lib/format-money";
import { Card } from "./card";
import { ProgressBar } from "./progress-bar";
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
