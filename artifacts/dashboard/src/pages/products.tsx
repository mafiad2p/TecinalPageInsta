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
        shipping_info: { processing: "1-2 ngày", us_delivery: "5-7 ngày", global_delivery: "10-15 ngày" },
        keywords: formData.name.toLowerCase().split(" "),
      };

      if (editingId) {
        await updateMut.mutateAsync({ id: editingId, ...payload });
        toast({ title: "Đã cập nhật sản phẩm" });
      } else {
        await createMut.mutateAsync(payload);
        toast({ title: "Đã tạo sản phẩm" });
      }
      setIsModalOpen(false);
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Bạn có chắc muốn vô hiệu hóa sản phẩm này?")) {
      try {
        await deleteMut.mutateAsync(id);
        toast({ title: "Đã vô hiệu hóa sản phẩm" });
      } catch (error: any) {
        toast({ title: "Lỗi", description: error.message, variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">Quản lý danh mục sản phẩm cho chatbot AI.</p>
        <Button onClick={() => openModal()}><Plus className="w-4 h-4 mr-2" /> Thêm sản phẩm</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-muted-foreground bg-secondary/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Sản phẩm</th>
                  <th className="px-6 py-4 font-medium">Mã SKU</th>
                  <th className="px-6 py-4 font-medium">Giá</th>
                  <th className="px-6 py-4 font-medium">Trạng thái</th>
                  <th className="px-6 py-4 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Đang tải...</td></tr>
                ) : products?.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Chưa có sản phẩm nào.</td></tr>
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
                          {p.is_active ? "Hoạt động" : "Tạm dừng"}
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
        title={editingId ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}
        description="Thông tin này sẽ được AI sử dụng để trả lời câu hỏi của khách hàng."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mã SKU</label>
              <Input 
                value={formData.sku} 
                onChange={(e) => setFormData({...formData, sku: e.target.value})} 
                required 
                disabled={!!editingId}
                placeholder="SP-001"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Giá (USD)</label>
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
            <label className="text-sm font-medium">Tên sản phẩm</label>
            <Input 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
              required 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Link mua hàng</label>
            <Input 
              type="url"
              value={formData.buy_link} 
              onChange={(e) => setFormData({...formData, buy_link: e.target.value})} 
              placeholder="https://store.example.com/san-pham"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Mô tả (Ngữ cảnh cho AI)</label>
            <Textarea 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})} 
              className="h-24"
              placeholder="Mô tả tính năng sản phẩm, lợi ích và các câu hỏi thường gặp..."
            />
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
              {createMut.isPending || updateMut.isPending ? "Đang lưu..." : "Lưu sản phẩm"}
            </Button>
          </div>
        </form>
      </CustomDialog>
    </div>
  );
}
