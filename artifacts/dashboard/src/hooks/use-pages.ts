import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export type FacebookPage = {
  id: number;
  page_id: string;
  page_name: string;
  instagram_account_id: string | null;
  is_active: boolean;
  config: Record<string, any>;
  created_at: string;
};

export type PageInput = {
  pageId: string;
  pageName: string;
  accessToken?: string; // only sent on create or explicit update
  instagramAccountId?: string;
  isActive?: boolean;
  config?: Record<string, any>;
};

export function usePages() {
  return useQuery({
    queryKey: ["/api/pages"],
    queryFn: () => fetchApi<FacebookPage[]>("/api/pages"),
  });
}

export function useCreatePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PageInput) =>
      fetchApi<FacebookPage>("/api/pages", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pages"] }),
  });
}

export function useUpdatePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, ...data }: { pageId: string } & Partial<PageInput>) =>
      fetchApi(`/api/pages/${pageId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pages"] }),
  });
}
