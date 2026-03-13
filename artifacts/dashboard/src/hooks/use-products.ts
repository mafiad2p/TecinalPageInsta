import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export type Product = {
  id: number;
  sku: string;
  name: string;
  description: string;
  price: string | number;
  currency: string;
  buy_link: string;
  shipping_info: Record<string, string>;
  keywords: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductInput = Omit<Product, "id" | "created_at" | "updated_at" | "is_active"> & {
  isActive?: boolean;
};

export function useProducts() {
  return useQuery({
    queryKey: ["/api/products"],
    queryFn: () => fetchApi<Product[]>("/api/products"),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductInput) =>
      fetchApi<Product>("/api/products", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          buyLink: data.buy_link,
          shippingInfo: data.shipping_info,
        }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/products"] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<ProductInput>) =>
      fetchApi(`/api/products/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...data,
          buyLink: data.buy_link,
          shippingInfo: data.shipping_info,
          isActive: data.isActive,
        }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/products"] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetchApi(`/api/products/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/products"] }),
  });
}
