import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export type DashboardStats = {
  period: string;
  comments: {
    total: number;
    negative: number;
    buy_intent: number;
  };
  dms: {
    total: number;
    escalated: number;
    ai_replied: number;
  };
};

export function useDashboardStats(days: number = 7) {
  return useQuery({
    queryKey: ["/api/reports/stats", days],
    queryFn: () => fetchApi<DashboardStats>(`/api/reports/stats?days=${days}`),
    refetchInterval: 30000, // Refresh every 30s
  });
}
