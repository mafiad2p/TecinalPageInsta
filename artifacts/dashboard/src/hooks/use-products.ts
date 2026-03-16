import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export type Product = {
  id: number;
  sku: string;
  name: string;
  description: string;
  price: string | number | null;
  currency: string;
  buy_link: string;
  image_url: string;
  shipping_info: Record<string, string>;
  shipping_rules: string;
  return_policy: string;
  product_docs: string;
  ai_summary: string;
  keywords: string[];
  assigned_pages: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function useProducts() {
  return useQuery({
    queryKey: ["/api/products"],
    queryFn: () => fetchApi<Product[]>("/api/products"),
  });
}

export function useProduct(id: number | null) {
  return useQuery({
    queryKey: ["/api/products", id],
    queryFn: () => fetchApi<Product>(`/api/products/${id}`),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      fetch("/api/products", { method: "POST", body: formData })
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok || json.success === false) throw new Error(json.error || `HTTP Error ${res.status}`);
          return json.data as Product;
        }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/products"] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
      fetch(`/api/products/${id}`, { method: "PUT", body: formData })
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok || json.success === false) throw new Error(json.error || `HTTP Error ${res.status}`);
          return json.data as Product;
        }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/products"] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetchApi(`/api/products/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/products"] }),
  });
}

export function useRegenerateSummary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetchApi<{ ai_summary: string }>(`/api/products/${id}/regenerate-summary`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/products"] }),
  });
}
