import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateMeBody } from "@buildtrust/shared";
import { apiClient } from "../lib/api-client";
import { useAuthStore } from "../lib/auth-store";

export function useUserReviews(userId: string) {
  return useQuery({
    queryKey: ["users", userId, "reviews"],
    queryFn: () => apiClient.users.reviews(userId),
    enabled: !!userId,
  });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  return useMutation({
    mutationFn: (body: UpdateMeBody) => apiClient.users.updateMe(body),
    onSuccess: (user) => {
      setUser(user);
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}
