import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";

export function useWallet() {
  return useQuery({ queryKey: ["wallet"], queryFn: () => apiClient.wallet.get() });
}
