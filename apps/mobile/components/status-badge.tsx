import { Text, View } from "react-native";
import type { ContractStatus, MilestoneStatus, ProjectStatus } from "@buildtrust/shared";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-background-alt text-muted",
  info: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-star/10 text-star",
  danger: "bg-outgoing/10 text-outgoing",
};

export interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
}

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  const [bgClass, textClass] = TONE_CLASSES[tone].split(" ");
  return (
    <View className={`self-start rounded-full px-3 py-1 ${bgClass}`}>
      <Text className={`text-xs font-medium ${textClass}`}>{label}</Text>
    </View>
  );
}

const PROJECT_STATUS: Record<ProjectStatus, { label: string; tone: BadgeTone }> = {
  PLANNING: { label: "Planning", tone: "neutral" },
  IN_PROGRESS: { label: "In Progress", tone: "info" },
  COMPLETED: { label: "Completed", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
};

const CONTRACT_STATUS: Record<ContractStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  ACTIVE: { label: "Active", tone: "info" },
  COMPLETED: { label: "Completed", tone: "success" },
  DISPUTED: { label: "Disputed", tone: "danger" },
};

const MILESTONE_STATUS: Record<MilestoneStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: "Pending", tone: "neutral" },
  IN_PROGRESS: { label: "In Progress", tone: "info" },
  SUBMITTED: { label: "Submitted", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  RELEASED: { label: "Released", tone: "success" },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const { label, tone } = PROJECT_STATUS[status];
  return <StatusBadge label={label} tone={tone} />;
}

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const { label, tone } = CONTRACT_STATUS[status];
  return <StatusBadge label={label} tone={tone} />;
}

export function MilestoneStatusBadge({ status }: { status: MilestoneStatus }) {
  const { label, tone } = MILESTONE_STATUS[status];
  return <StatusBadge label={label} tone={tone} />;
}
