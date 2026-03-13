import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export type DailyReport = {
  id: number;
  report_date: string;
  total_comments: number;
  negative_comments: number;
  buy_intent_comments: number;
  hidden_comments: number;
  total_dms: number;
  escalated_dms: number;
  ai_replied_dms: number;
  report_data: any;
  sent_at: string | null;
};

export function useDailyReports(limit = 30) {
  return useQuery({
    queryKey: ["/api/reports/daily", limit],
    queryFn: () => fetchApi<DailyReport[]>(`/api/reports/daily?limit=${limit}`),
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchApi("/api/reports/generate", {
        method: "POST",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/reports/daily"] }),
  });
}
