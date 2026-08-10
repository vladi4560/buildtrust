import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateProjectBody } from "@buildtrust/shared";
import { apiClient } from "../lib/api-client";

export function useProjects() {
  return useQuery({ queryKey: ["projects"], queryFn: () => apiClient.projects.list() });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: () => apiClient.projects.get(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProjectBody) => apiClient.projects.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
