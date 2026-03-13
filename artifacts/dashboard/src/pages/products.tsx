import { useState } from "react";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, Product } from "@/hooks/use-products";
import { Card, CardContent } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button-custom";
import { Input, Textarea } from "@/components/ui/input-custom";
import { Badge } from "@/components/ui/badge-custom";
import { CustomDialog } from "@/components/ui/dialog-custom";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, ExternalLink } from "lucide-react";

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const createMut = useCreateProduct();
  const updateMut = useUpdateProduct();
  const deleteMut = useDeleteProduct();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    price: "",
    buy_link: "",
  });

  const openModal = (product?: Product) => {
    if (product) {
      setEditingId(product.id);
      setFormData({
        sku: product.sku,
        name: product.name,
        description: product.description || "",
        price: product.price.toString(),
        buy_link: product.buy_link || "",
      });
    } else {
      setEditingId(null);
      setFormData({ sku: "", name: "", description: "", price: "", buy_link: "" });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        currency: "USD",
        shipping_info: { processing: "1-2 days", us_delivery: "5-7 days", global_delivery: "10-15 days" },
        keywords: formData.name.toLowerCase().split(" "),
      };

      if (editingId) {
        await updateMut.mutateAsync({ id: editingId, ...payload });
        toast({ title: "Product updated" });
      } else {
        await createMut.mutateAsync(payload);
        toast({ title: "Product created" });
      }
      setIsModalOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to deactivate this product?")) {
      try {
        await deleteMut.mutateAsync(id);
        toast({ title: "Product removed" });
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">Manage your product knowledge base for the AI chatbot.</p>
        <Button onClick={() => openModal()}><Plus className="w-4 h-4 mr-2" /> Add Product</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-muted-foreground bg-secondary/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium">SKU</th>
                  <th className="px-6 py-4 font-medium">Price</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : products?.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No products found.</td></tr>
                ) : (
                  products?.map((p) => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-xs">{p.description}</p>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{p.sku}</td>
                      <td className="px-6 py-4">${p.price}</td>
                      <td className="px-6 py-4">
                        <Badge variant={p.is_active ? "success" : "secondary"}>
                          {p.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <a href={p.buy_link} target="_blank" rel="noreferrer" className="p-2 text-muted-foreground hover:text-primary transition-colors">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button onClick={() => openModal(p)} className="p-2 text-muted-foreground hover:text-accent transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {p.is_active && (
                            <button onClick={() => handleDelete(p.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <CustomDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit Product" : "Add Product"}
        description="This information will be used by the AI to answer customer questions."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">SKU</label>
              <Input 
                value={formData.sku} 
                onChange={(e) => setFormData({...formData, sku: e.target.value})} 
                required 
                disabled={!!editingId}
                placeholder="PROD-001"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Price (USD)</label>
              <Input 
                type="number" 
                step="0.01" 
                value={formData.price} 
                onChange={(e) => setFormData({...formData, price: e.target.value})} 
                required 
                placeholder="29.99"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Product Name</label>
            <Input 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
              required 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Buy Link</label>
            <Input 
              type="url"
              value={formData.buy_link} 
              onChange={(e) => setFormData({...formData, buy_link: e.target.value})} 
              placeholder="https://store.example.com/product"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description (For AI context)</label>
            <Textarea 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})} 
              className="h-24"
              placeholder="Describe the product features, benefits, and common FAQs..."
            />
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
              {createMut.isPending || updateMut.isPending ? "Saving..." : "Save Product"}
            </Button>
          </div>
        </form>
      </CustomDialog>
    </div>
  );
}
