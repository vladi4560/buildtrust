import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";

export function useDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) => apiClient.escrow.deposit({ contractId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
    },
  });
}
