import { useState } from "react";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useRegenerateSummary, Product } from "@/hooks/use-products";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button-custom";
import { Input, Textarea } from "@/components/ui/input-custom";
import { Badge } from "@/components/ui/badge-custom";
import { CustomDialog } from "@/components/ui/dialog-custom";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, ExternalLink, ImagePlus, FileText, RefreshCw, Loader2, Package, ShoppingCart, Truck, ShieldCheck, Brain, X, Eye } from "lucide-react";

type FormState = {
  sku: string;
  name: string;
  description: string;
  price: string;
  buy_link: string;
  shipping_rules: string;
  return_policy: string;
};

const emptyForm: FormState = {
  sku: "",
  name: "",
  description: "",
  price: "",
  buy_link: "",
  shipping_rules: "",
  return_policy: "",
};

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const createMut = useCreateProduct();
  const updateMut = useUpdateProduct();
  const deleteMut = useDeleteProduct();
  const regenerateMut = useRegenerateSummary();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [docFile, setDocFile] = useState<File | null>(null);

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        sku: product.sku,
        name: product.name,
        description: product.description || "",
        price: product.price.toString(),
        buy_link: product.buy_link || "",
        shipping_rules: product.shipping_rules || "",
        return_policy: product.return_policy || "",
      });
      setImagePreview(product.image_url || "");
    } else {
      setEditingProduct(null);
      setFormData(emptyForm);
      setImagePreview("");
    }
    setImageFile(null);
    setDocFile(null);
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setDocFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append("sku", formData.sku);
      fd.append("name", formData.name);
      fd.append("description", formData.description);
      fd.append("price", formData.price);
      fd.append("currency", "VND");
      fd.append("buyLink", formData.buy_link);
      fd.append("shippingRules", formData.shipping_rules);
      fd.append("returnPolicy", formData.return_policy);
      fd.append("keywords", formData.name.toLowerCase().split(" ").join(","));
      if (imageFile) fd.append("image", imageFile);
      if (docFile) fd.append("document", docFile);

      if (editingProduct) {
        fd.append("regenerateSummary", "true");
        await updateMut.mutateAsync({ id: editingProduct.id, formData: fd });
        toast({ title: "Đã cập nhật sản phẩm", description: "AI đang cập nhật bản tóm tắt..." });
      } else {
        await createMut.mutateAsync(fd);
        toast({ title: "Đã tạo sản phẩm", description: "AI đã tự động tạo bản tóm tắt." });
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

  const handleRegenerate = async (id: number) => {
    try {
      await regenerateMut.mutateAsync(id);
      toast({ title: "Đã tạo lại bản tóm tắt AI" });
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-muted-foreground">Kho kiến thức sản phẩm cho AI tư vấn khách hàng.</p>
        </div>
        <Button onClick={() => openModal()}><Plus className="w-4 h-4 mr-2" /> Thêm sản phẩm</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
      ) : products?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Chưa có sản phẩm nào.</p>
            <p className="text-sm text-muted-foreground mt-1">Thêm sản phẩm để AI có thể tư vấn cho khách hàng.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {products?.map((p) => (
            <Card key={p.id} className={`overflow-hidden transition-all hover:border-primary/30 ${!p.is_active ? "opacity-50" : ""}`}>
              {p.image_url && (
                <div className="h-40 bg-secondary/30 overflow-hidden">
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{p.name}</CardTitle>
                    <p className="text-xs text-muted-foreground font-mono mt-1">SKU: {p.sku}</p>
                  </div>
                  <Badge variant={p.is_active ? "success" : "secondary"} className="ml-2 shrink-0">
                    {p.is_active ? "Hoạt động" : "Tạm dừng"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Giá:</span>
                  <span className="font-semibold text-primary">{Number(p.price).toLocaleString()} {p.currency}</span>
                </div>

                {p.ai_summary && (
                  <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/20">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Brain className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-xs font-medium text-violet-400">Tóm tắt AI</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">{p.ai_summary}</p>
                  </div>
                )}

                <div className="flex items-center gap-1.5 flex-wrap">
                  {p.buy_link && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <ShoppingCart className="w-3 h-3" /> Link mua
                    </Badge>
                  )}
                  {p.shipping_rules && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Truck className="w-3 h-3" /> Vận chuyển
                    </Badge>
                  )}
                  {p.return_policy && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <ShieldCheck className="w-3 h-3" /> Chính sách
                    </Badge>
                  )}
                  {p.product_docs && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <FileText className="w-3 h-3" /> Tài liệu
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setViewingProduct(p)} className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Xem chi tiết">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => openModal(p)} className="p-1.5 rounded-md text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors" title="Chỉnh sửa">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRegenerate(p.id)}
                      disabled={regenerateMut.isPending}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-violet-400 hover:bg-violet-400/10 transition-colors disabled:opacity-50"
                      title="Tạo lại tóm tắt AI"
                    >
                      <RefreshCw className={`w-4 h-4 ${regenerateMut.isPending ? "animate-spin" : ""}`} />
                    </button>
                    {p.buy_link && (
                      <a href={p.buy_link} target="_blank" rel="noreferrer" className="p-1.5 rounded-md text-muted-foreground hover:text-blue-400 hover:bg-blue-400/10 transition-colors" title="Link mua hàng">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  {p.is_active && (
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Vô hiệu hóa">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CustomDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
        description="AI sẽ tự động đọc và tóm tắt thông tin sản phẩm sau khi lưu."
      >
        <form onSubmit={handleSubmit} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-muted-foreground" />
              Ảnh sản phẩm
            </label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-border">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(""); }}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : null}
              <label className="flex-1 flex items-center justify-center border-2 border-dashed border-border/50 rounded-xl h-24 cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-colors">
                <div className="text-center">
                  <ImagePlus className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                  <span className="text-xs text-muted-foreground">Chọn ảnh</span>
                </div>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mã SKU</label>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData({...formData, sku: e.target.value})}
                required
                disabled={!!editingProduct}
                placeholder="SP-001"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Giá (VND)</label>
              <Input
                type="number"
                step="1000"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                required
                placeholder="299000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tên sản phẩm</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              placeholder="Tên sản phẩm..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-muted-foreground" />
              Link mua hàng
            </label>
            <Input
              type="url"
              value={formData.buy_link}
              onChange={(e) => setFormData({...formData, buy_link: e.target.value})}
              placeholder="https://store.example.com/san-pham"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Mô tả sản phẩm
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="h-24"
              placeholder="Mô tả chi tiết về sản phẩm, tính năng, lợi ích..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              File tài liệu sản phẩm
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center gap-3 border border-border/50 rounded-xl px-4 py-3 cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-colors">
                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground truncate">
                  {docFile ? docFile.name : editingProduct?.product_docs ? "Đã có tài liệu (chọn để thay)" : "Chọn file (.txt, .md, .csv, .pdf)"}
                </span>
                <input type="file" accept=".txt,.md,.csv,.pdf,.doc,.docx" onChange={handleDocChange} className="hidden" />
              </label>
              {docFile && (
                <button type="button" onClick={() => setDocFile(null)} className="p-2 text-muted-foreground hover:text-destructive">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Truck className="w-4 h-4 text-muted-foreground" />
              Quy định vận chuyển
            </label>
            <Textarea
              value={formData.shipping_rules}
              onChange={(e) => setFormData({...formData, shipping_rules: e.target.value})}
              className="h-24"
              placeholder="Thời gian xử lý, phí ship, khu vực giao hàng..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-muted-foreground" />
              Chính sách đổi trả
            </label>
            <Textarea
              value={formData.return_policy}
              onChange={(e) => setFormData({...formData, return_policy: e.target.value})}
              className="h-24"
              placeholder="Điều kiện đổi trả, thời hạn, quy trình..."
            />
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
              {createMut.isPending || updateMut.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang lưu & AI đang phân tích...</>
              ) : (
                <><Brain className="w-4 h-4 mr-2" /> Lưu & AI tóm tắt</>
              )}
            </Button>
          </div>
        </form>
      </CustomDialog>

      <CustomDialog
        isOpen={!!viewingProduct}
        onClose={() => setViewingProduct(null)}
        title={viewingProduct?.name || "Chi tiết sản phẩm"}
        description={`SKU: ${viewingProduct?.sku || ""}`}
      >
        {viewingProduct && (
          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
            {viewingProduct.image_url && (
              <div className="rounded-xl overflow-hidden border border-border">
                <img src={viewingProduct.image_url} alt={viewingProduct.name} className="w-full h-48 object-cover" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Giá</p>
                <p className="font-semibold text-primary">{Number(viewingProduct.price).toLocaleString()} {viewingProduct.currency}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Trạng thái</p>
                <p className="font-semibold">{viewingProduct.is_active ? "Đang hoạt động" : "Tạm dừng"}</p>
              </div>
            </div>

            {viewingProduct.buy_link && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><ShoppingCart className="w-3 h-3" /> Link mua hàng</p>
                <a href={viewingProduct.buy_link} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:underline break-all">{viewingProduct.buy_link}</a>
              </div>
            )}

            {viewingProduct.description && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Mô tả</p>
                <p className="text-sm whitespace-pre-wrap">{viewingProduct.description}</p>
              </div>
            )}

            {viewingProduct.shipping_rules && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><Truck className="w-3 h-3" /> Quy định vận chuyển</p>
                <p className="text-sm whitespace-pre-wrap">{viewingProduct.shipping_rules}</p>
              </div>
            )}

            {viewingProduct.return_policy && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Chính sách đổi trả</p>
                <p className="text-sm whitespace-pre-wrap">{viewingProduct.return_policy}</p>
              </div>
            )}

            {viewingProduct.ai_summary && (
              <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20">
                <p className="text-xs font-medium text-violet-400 mb-2 flex items-center gap-1"><Brain className="w-3.5 h-3.5" /> Bản tóm tắt AI</p>
                <p className="text-sm whitespace-pre-wrap">{viewingProduct.ai_summary}</p>
              </div>
            )}

            <div className="pt-3 border-t border-border flex justify-between">
              <Button variant="ghost" onClick={() => { setViewingProduct(null); openModal(viewingProduct); }}>
                <Edit2 className="w-4 h-4 mr-2" /> Chỉnh sửa
              </Button>
              <Button
                variant="outline"
                onClick={() => handleRegenerate(viewingProduct.id)}
                disabled={regenerateMut.isPending}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${regenerateMut.isPending ? "animate-spin" : ""}`} />
                Tạo lại tóm tắt AI
              </Button>
            </div>
          </div>
        )}
      </CustomDialog>
    </div>
  );
}
