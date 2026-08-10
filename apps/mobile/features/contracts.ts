import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateContractBody } from "@buildtrust/shared";
import { apiClient } from "../lib/api-client";

export function useContract(id: string) {
  return useQuery({
    queryKey: ["contracts", id],
    queryFn: () => apiClient.contracts.get(id),
    enabled: !!id,
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateContractBody) => apiClient.contracts.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
