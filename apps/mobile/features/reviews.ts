import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateReviewBody } from "@buildtrust/shared";
import { apiClient } from "../lib/api-client";

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateReviewBody) => apiClient.reviews.create(body),
    onSuccess: (review) => {
      queryClient.invalidateQueries({ queryKey: ["users", review.subjectId, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["professionals", review.subjectId] });
    },
  });
}
