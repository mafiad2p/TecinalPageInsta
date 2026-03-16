import { useState } from "react";
import { useScenarios, useCreateScenario, useDeleteScenario, Scenario } from "@/hooks/use-scenarios";
import { Card, CardContent } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button-custom";
import { Input, Textarea } from "@/components/ui/input-custom";
import { Badge } from "@/components/ui/badge-custom";
import { CustomDialog } from "@/components/ui/dialog-custom";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Zap } from "lucide-react";

const triggerTypeLabels: Record<string, string> = {
  BUY_INTENT: "Ý định mua",
  ORDER_TRACKING: "Theo dõi đơn hàng",
  COMPLAINT: "Khiếu nại",
  GENERAL_INQUIRY: "Câu hỏi chung",
  ADDRESS_CHANGE: "Thay đổi địa chỉ",
  REFUND: "Hoàn tiền",
  PAYMENT_ISSUE: "Vấn đề thanh toán",
};

const actionTypeLabels: Record<string, string> = {
  REPLY_AND_HIDE: "Trả lời & Ẩn",
  AUTO_REPLY: "Tự động trả lời",
  AUTO_REPLY_AND_ESCALATE: "Trả lời & Chuyển tiếp",
  SKIP: "Bỏ qua",
  DELETE: "Xóa",
  HIDE: "Ẩn",
  REPLY_AND_DM_AND_HIDE: "Trả lời, Nhắn tin & Ẩn",
};

export default function Scenarios() {
  const { data: scenarios, isLoading } = useScenarios();
  const createMut = useCreateScenario();
  const deleteMut = useDeleteScenario();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    triggerType: "GENERAL_INQUIRY",
    triggerKeywords: "",
    responseTemplate: "",
    actionType: "AUTO_REPLY",
    priority: 10,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMut.mutateAsync({
        ...formData,
        triggerKeywords: formData.triggerKeywords.split(",").map(k => k.trim()).filter(Boolean),
      });
      toast({ title: "Đã tạo kịch bản" });
      setIsModalOpen(false);
      setFormData({ name: "", triggerType: "GENERAL_INQUIRY", triggerKeywords: "", responseTemplate: "", actionType: "AUTO_REPLY", priority: 10 });
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Xóa kịch bản này?")) {
      await deleteMut.mutateAsync(id);
      toast({ title: "Đã xóa" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">Quy tắc tự động và phản hồi nhanh cho các ý định cụ thể.</p>
        <Button onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4 mr-2" /> Kịch bản mới</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-muted-foreground bg-secondary/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Tên kịch bản</th>
                  <th className="px-6 py-4 font-medium">Ý định kích hoạt</th>
                  <th className="px-6 py-4 font-medium">Hành động</th>
                  <th className="px-6 py-4 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center">Đang tải...</td></tr>
                ) : (
                  scenarios?.map((s) => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="px-6 py-4">
                        <p className="font-medium flex items-center">
                          <Zap className="w-3 h-3 text-accent mr-2" />
                          {s.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs">{s.response_template}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">{triggerTypeLabels[s.trigger_type] || s.trigger_type}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={s.action_type.includes('ESCALATE') ? "warning" : "secondary"}>
                          {actionTypeLabels[s.action_type] || s.action_type.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDelete(s.id)} className="p-2 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
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
        title="Thêm kịch bản"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tên</label>
            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ý định kích hoạt</label>
              <select 
                className="flex h-11 w-full rounded-xl border-2 border-border bg-background/50 px-3 py-2 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10"
                value={formData.triggerType}
                onChange={e => setFormData({...formData, triggerType: e.target.value})}
              >
                <option value="BUY_INTENT">Ý định mua</option>
                <option value="ORDER_TRACKING">Theo dõi đơn hàng</option>
                <option value="COMPLAINT">Khiếu nại</option>
                <option value="GENERAL_INQUIRY">Câu hỏi chung</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hành động</label>
              <select 
                className="flex h-11 w-full rounded-xl border-2 border-border bg-background/50 px-3 py-2 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10"
                value={formData.actionType}
                onChange={e => setFormData({...formData, actionType: e.target.value})}
              >
                <option value="REPLY_AND_HIDE">Trả lời & Ẩn</option>
                <option value="AUTO_REPLY">Tự động trả lời</option>
                <option value="AUTO_REPLY_AND_ESCALATE">Trả lời & Chuyển tiếp</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Mẫu phản hồi</label>
            <Textarea 
              value={formData.responseTemplate} 
              onChange={e => setFormData({...formData, responseTemplate: e.target.value})} 
              required 
              className="h-24"
            />
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" disabled={createMut.isPending}>Lưu</Button>
          </div>
        </form>
      </CustomDialog>
    </div>
  );
}
