import { useQuery } from "@tanstack/react-query";
import type { ListProfessionalsQuery } from "@buildtrust/shared";
import { apiClient } from "../lib/api-client";

export function useProfessionals(query?: ListProfessionalsQuery) {
  return useQuery({
    queryKey: ["professionals", query],
    queryFn: () => apiClient.professionals.list(query),
  });
}

export function useProfessional(id: string) {
  return useQuery({
    queryKey: ["professionals", id],
    queryFn: () => apiClient.professionals.get(id),
    enabled: !!id,
  });
}

export function usePortfolio(id: string) {
  return useQuery({
    queryKey: ["professionals", id, "portfolio"],
    queryFn: () => apiClient.professionals.portfolio(id),
    enabled: !!id,
  });
}
