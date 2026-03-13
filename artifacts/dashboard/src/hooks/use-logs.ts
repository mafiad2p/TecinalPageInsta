import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export type SystemLog = {
  id: number;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  context: any;
  service: string;
  trace_id: string | null;
  created_at: string;
};

export function useSystemLogs(level?: string, limit = 100) {
  const queryParams = new URLSearchParams();
  queryParams.set("limit", limit.toString());
  if (level && level !== "all") queryParams.set("level", level);

  return useQuery({
    queryKey: ["/api/reports/logs", level, limit],
    queryFn: () => fetchApi<SystemLog[]>(`/api/reports/logs?${queryParams.toString()}`),
    refetchInterval: 10000, // Refresh every 10s
  });
}
