import { useState } from "react";
import { usePrompts, useUpdatePrompt, AIPrompt } from "@/hooks/use-prompts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button-custom";
import { Textarea } from "@/components/ui/input-custom";
import { Badge } from "@/components/ui/badge-custom";
import { CustomDialog } from "@/components/ui/dialog-custom";
import { useToast } from "@/hooks/use-toast";
import { Edit2, Sparkles } from "lucide-react";

export default function Prompts() {
  const { data: prompts, isLoading } = usePrompts();
  const updateMut = useUpdatePrompt();
  const { toast } = useToast();

  const [selectedPrompt, setSelectedPrompt] = useState<AIPrompt | null>(null);
  const [editText, setEditText] = useState("");

  const openEdit = (prompt: AIPrompt) => {
    setSelectedPrompt(prompt);
    setEditText(prompt.prompt_text);
  };

  const handleSave = async () => {
    if (!selectedPrompt) return;
    try {
      await updateMut.mutateAsync({ key: selectedPrompt.key, promptText: editText });
      toast({ title: "Đã cập nhật prompt", description: "Mô hình AI sẽ sử dụng hướng dẫn mới ngay lập tức." });
      setSelectedPrompt(null);
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) return <div className="p-8 text-center">Đang tải prompt...</div>;

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">Các hướng dẫn chính kiểm soát cách AI OpenClaw hoạt động.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {prompts?.map((prompt) => (
          <Card key={prompt.id} className="group hover:border-primary/50 transition-colors flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex justify-between items-start">
                <Badge variant="outline" className="font-mono text-[10px] py-1 bg-secondary/50">
                  {prompt.key}
                </Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2" onClick={() => openEdit(prompt)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
              <CardTitle className="text-base mt-3">{prompt.description}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-1">
              <div className="relative h-full">
                <p className="text-sm text-muted-foreground line-clamp-6 leading-relaxed">
                  {prompt.prompt_text}
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CustomDialog
        isOpen={!!selectedPrompt}
        onClose={() => setSelectedPrompt(null)}
        title="Chỉnh sửa Prompt AI"
        description={selectedPrompt?.description}
      >
        <div className="space-y-4">
          <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 flex items-start">
            <Sparkles className="w-5 h-5 text-primary mr-3 shrink-0 mt-0.5" />
            <p className="text-sm text-primary-foreground/80">
              Hãy cẩn thận khi chỉnh sửa các hướng dẫn này. Chúng ảnh hưởng trực tiếp đến cách AI phân loại ý định và tạo phản hồi.
            </p>
          </div>
          
          <Textarea 
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="min-h-[250px] font-mono text-sm leading-relaxed"
          />

          <div className="pt-4 flex justify-end space-x-3 border-t border-border">
            <Button variant="ghost" onClick={() => setSelectedPrompt(null)}>Hủy</Button>
            <Button onClick={handleSave} disabled={updateMut.isPending}>
              {updateMut.isPending ? "Đang lưu..." : "Lưu hướng dẫn"}
            </Button>
          </div>
        </div>
      </CustomDialog>
    </div>
  );
}
