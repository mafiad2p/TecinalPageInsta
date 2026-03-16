import { useState } from "react";
import { usePages, useCreatePage, useUpdatePage } from "@/hooks/use-pages";
import { Card, CardContent } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button-custom";
import { Input } from "@/components/ui/input-custom";
import { Badge } from "@/components/ui/badge-custom";
import { CustomDialog } from "@/components/ui/dialog-custom";
import { useToast } from "@/hooks/use-toast";
import { Facebook, Plus, Power, PowerOff } from "lucide-react";

export default function PagesConfig() {
  const { data: pages, isLoading } = usePages();
  const createMut = useCreatePage();
  const updateMut = useUpdatePage();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    pageId: "",
    pageName: "",
    accessToken: "",
    instagramAccountId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMut.mutateAsync(formData);
      toast({ title: "Đã thêm trang thành công" });
      setIsModalOpen(false);
      setFormData({ pageId: "", pageName: "", accessToken: "", instagramAccountId: "" });
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    }
  };

  const toggleStatus = async (pageId: string, currentStatus: boolean) => {
    try {
      await updateMut.mutateAsync({ pageId, isActive: !currentStatus });
      toast({ title: `Trang đã ${!currentStatus ? 'kích hoạt' : 'tạm dừng'}` });
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">Kết nối Trang Facebook và tài khoản Instagram chuyên nghiệp.</p>
        <Button onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4 mr-2" /> Kết nối trang</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <p className="text-muted-foreground p-4">Đang tải danh sách trang...</p>
        ) : (
          pages?.map((page) => (
            <Card key={page.id} className={page.is_active ? "border-primary/30" : "opacity-75"}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-500 flex items-center justify-center mr-4">
                      <Facebook className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-lg">{page.page_name}</h3>
                      <p className="text-xs font-mono text-muted-foreground">ID: {page.page_id}</p>
                    </div>
                  </div>
                  <Badge variant={page.is_active ? "success" : "secondary"}>
                    {page.is_active ? "Đang lắng nghe" : "Tạm dừng"}
                  </Badge>
                </div>
                
                <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Tài khoản IG: <span className="font-mono text-foreground">{page.instagram_account_id || "Chưa kết nối"}</span>
                  </div>
                  <Button 
                    variant={page.is_active ? "outline" : "default"} 
                    size="sm"
                    onClick={() => toggleStatus(page.page_id, page.is_active)}
                    disabled={updateMut.isPending}
                  >
                    {page.is_active ? (
                      <><PowerOff className="w-4 h-4 mr-2" /> Tạm dừng</>
                    ) : (
                      <><Power className="w-4 h-4 mr-2" /> Kích hoạt</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <CustomDialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Kết nối trang Facebook">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tên trang</label>
            <Input value={formData.pageName} onChange={e => setFormData({...formData, pageName: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">ID Trang</label>
            <Input value={formData.pageId} onChange={e => setFormData({...formData, pageId: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Access Token của trang</label>
            <Input type="password" value={formData.accessToken} onChange={e => setFormData({...formData, accessToken: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">ID tài khoản Instagram (Tùy chọn)</label>
            <Input value={formData.instagramAccountId} onChange={e => setFormData({...formData, instagramAccountId: e.target.value})} />
          </div>
          <div className="pt-4 flex justify-end space-x-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" disabled={createMut.isPending}>Kết nối</Button>
          </div>
        </form>
      </CustomDialog>
    </div>
  );
}
