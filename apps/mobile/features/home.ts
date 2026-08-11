import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";

export function useHomeSummary() {
  return useQuery({ queryKey: ["home", "summary"], queryFn: () => apiClient.home.summary() });
}

export function useActionItems() {
  return useQuery({
    queryKey: ["home", "action-items"],
    queryFn: () => apiClient.home.actionItems(),
  });
}
