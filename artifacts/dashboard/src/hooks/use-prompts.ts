import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export type AIPrompt = {
  id: number;
  key: string;
  description: string;
  prompt_text: string;
  is_active: boolean;
  updated_at: string;
};

export function usePrompts() {
  return useQuery({
    queryKey: ["/api/prompts"],
    queryFn: () => fetchApi<AIPrompt[]>("/api/prompts"),
  });
}

export function useUpdatePrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, promptText }: { key: string; promptText: string }) =>
      fetchApi(`/api/prompts/${key}`, {
        method: "PUT",
        body: JSON.stringify({ promptText }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/prompts"] }),
  });
}
