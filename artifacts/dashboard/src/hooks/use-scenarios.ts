import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export type Scenario = {
  id: number;
  name: string;
  trigger_type: string;
  trigger_keywords: string[];
  response_template: string;
  action_type: string;
  priority: number;
  is_active: boolean;
  created_at: string;
};

export type ScenarioInput = {
  name: string;
  triggerType: string;
  triggerKeywords: string[];
  responseTemplate: string;
  actionType: string;
  priority: number;
  isActive?: boolean;
};

export function useScenarios() {
  return useQuery({
    queryKey: ["/api/scenarios"],
    queryFn: () => fetchApi<Scenario[]>("/api/scenarios"),
  });
}

export function useCreateScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ScenarioInput) =>
      fetchApi<Scenario>("/api/scenarios", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/scenarios"] }),
  });
}

export function useUpdateScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<ScenarioInput>) =>
      fetchApi(`/api/scenarios/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/scenarios"] }),
  });
}

export function useDeleteScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetchApi(`/api/scenarios/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/scenarios"] }),
  });
}
