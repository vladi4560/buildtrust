import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Button,
  Card,
  ContractStatusBadge,
  EmptyState,
  ErrorState,
  LoadingState,
  MilestoneStatusBadge,
  ProgressBar,
  ProjectStatusBadge,
} from "../../components";
import {
  useContract,
  useDeposit,
  useProject,
  useSubmitMilestone,
  useApproveMilestone,
} from "../../features";
import { formatMoney, useAuthStore } from "../../lib";

const TABS = ["Overview", "Payments", "Timeline", "Files"] as const;
type Tab = (typeof TABS)[number];

export default function ProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [tab, setTab] = useState<Tab>("Overview");

  const projectQuery = useProject(id);
  const contractId = projectQuery.data?.activeContract?.id;
  const contractQuery = useContract(contractId ?? "");

  const submitMilestone = useSubmitMilestone();
  const approveMilestone = useApproveMilestone();
  const deposit = useDeposit();

  if (projectQuery.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <ErrorState message="Couldn't load this project." onRetry={() => projectQuery.refetch()} />
      </SafeAreaView>
    );
  }

  const project = projectQuery.data;
  const contract = contractQuery.data;
  const isClient = !contract || contract.professionalId !== user?.id;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="gap-1 px-6 pt-6">
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 text-2xl font-bold text-ink">{project.title}</Text>
          <Text className="text-sm font-medium text-muted" onPress={() => router.back()}>
            Back
          </Text>
        </View>
        <ProjectStatusBadge status={project.status} />
      </View>

      <View className="mt-4 flex-row border-b border-border px-6">
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

      <ScrollView contentContainerClassName="gap-4 px-6 py-5">
        {tab === "Overview" ? (
          <View className="gap-4">
            {project.description ? (
              <Text className="text-sm text-muted">{project.description}</Text>
            ) : null}
            <Card>
              <Text className="text-sm text-muted">Budget</Text>
              <Text className="mt-1 text-2xl font-bold text-ink">
                {formatMoney(project.budgetPlanned)}
              </Text>
              <View className="mt-3">
                <ProgressBar percent={project.progressPercent} />
                <Text className="mt-1.5 text-xs text-muted">
                  {formatMoney(project.spent)} spent ({Math.round(project.progressPercent)}%)
                </Text>
              </View>
            </Card>
            {!contract ? <EmptyState message="No contract yet for this project." /> : null}
          </View>
        ) : null}

        {tab === "Payments" ? (
          <View className="gap-4">
            {!contractId ? (
              <EmptyState message="No contract yet - payments will appear once one is created." />
            ) : contractQuery.isPending ? (
              <LoadingState />
            ) : contractQuery.isError || !contract ? (
              <ErrorState
                message="Couldn't load payment details."
                onRetry={() => contractQuery.refetch()}
              />
            ) : (
              <View className="gap-4">
                <View className="flex-row items-center justify-between">
                  <ContractStatusBadge status={contract.status} />
                  <Text className="text-sm text-muted">{formatMoney(contract.amount)}</Text>
                </View>

                {contract.status === "DRAFT" && isClient ? (
                  <Button
                    label="Fund Escrow"
                    onPress={() => deposit.mutate(contract.id)}
                    loading={deposit.isPending}
                  />
                ) : null}

                <View className="gap-3">
                  {contract.milestones.map((milestone) => (
                    <Card key={milestone.id}>
                      <View className="flex-row items-start justify-between gap-2">
                        <Text className="flex-1 text-sm font-medium text-ink">
                          {milestone.order}. {milestone.title}
                        </Text>
                        <MilestoneStatusBadge status={milestone.status} />
                      </View>
                      <Text className="mt-1 text-sm text-muted">
                        {formatMoney(milestone.amount)}
                      </Text>

                      {!isClient && ["PENDING", "IN_PROGRESS"].includes(milestone.status) ? (
                        <View className="mt-3">
                          <Button
                            label="Submit for Approval"
                            variant="outline"
                            onPress={() => submitMilestone.mutate(milestone.id)}
                            loading={submitMilestone.isPending}
                          />
                        </View>
                      ) : null}

                      {isClient && milestone.status === "SUBMITTED" ? (
                        <View className="mt-3">
                          <Button
                            label="Approve & Release Funds"
                            onPress={() => approveMilestone.mutate(milestone.id)}
                            loading={approveMilestone.isPending}
                          />
                        </View>
                      ) : null}
                    </Card>
                  ))}
                </View>

                {contract.status === "ACTIVE" || contract.status === "COMPLETED" ? (
                  <Button
                    label="Rate & Review"
                    variant="outline"
                    onPress={() => router.push(`/contract/${contract.id}/review`)}
                  />
                ) : null}
              </View>
            )}
          </View>
        ) : null}

        {tab === "Timeline" ? (
          <View className="gap-3">
            {!contract ? (
              <EmptyState message="No contract yet - timeline will appear once one is created." />
            ) : (
              <>
                <Card>
                  <Text className="text-sm text-muted">Start Date</Text>
                  <Text className="mt-1 text-base font-medium text-ink">
                    {new Date(contract.startDate).toLocaleDateString()}
                  </Text>
                </Card>
                <Card>
                  <Text className="text-sm text-muted">Estimated End</Text>
                  <Text className="mt-1 text-base font-medium text-ink">
                    {new Date(contract.estimatedEnd).toLocaleDateString()}
                  </Text>
                </Card>
                <Card>
                  <Text className="text-sm text-muted">Working Days</Text>
                  <Text className="mt-1 text-base font-medium text-ink">
                    {contract.workingDays}
                  </Text>
                </Card>
              </>
            )}
          </View>
        ) : null}

        {tab === "Files" ? <EmptyState message="File sharing is coming soon." /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
