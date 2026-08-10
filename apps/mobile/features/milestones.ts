import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";

function useMilestoneAction(action: (id: string) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => action(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useSubmitMilestone() {
  return useMilestoneAction((id) => apiClient.milestones.submit(id));
}

export function useApproveMilestone() {
  return useMilestoneAction((id) => apiClient.milestones.approve(id));
}
