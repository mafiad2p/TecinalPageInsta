import { useDailyReports, useGenerateReport } from "@/hooks/use-reports";
import { Card, CardContent } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button-custom";
import { Badge } from "@/components/ui/badge-custom";
import { useToast } from "@/hooks/use-toast";
import { Send, CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

export default function Reports() {
  const { data: reports, isLoading } = useDailyReports();
  const generateMut = useGenerateReport();
  const { toast } = useToast();

  const handleGenerate = async () => {
    try {
      await generateMut.mutateAsync();
      toast({ title: "Đã tạo báo cáo", description: "Đã gửi thành công tới Telegram." });
    } catch (error: any) {
      toast({ title: "Tạo báo cáo thất bại", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">Tổng kết hiệu suất hàng ngày đã gửi tới Telegram.</p>
        <Button onClick={handleGenerate} disabled={generateMut.isPending}>
          <Send className="w-4 h-4 mr-2" /> 
          {generateMut.isPending ? "Đang tạo..." : "Tạo báo cáo hôm nay"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-muted-foreground bg-secondary/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Ngày</th>
                  <th className="px-6 py-4 font-medium text-center">Bình luận</th>
                  <th className="px-6 py-4 font-medium text-center">Ý định mua</th>
                  <th className="px-6 py-4 font-medium text-center">Tiêu cực</th>
                  <th className="px-6 py-4 font-medium text-center">Tin nhắn</th>
                  <th className="px-6 py-4 font-medium text-center">Chuyển tiếp</th>
                  <th className="px-6 py-4 font-medium text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center">Đang tải...</td></tr>
                ) : reports?.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Chưa có báo cáo nào.</td></tr>
                ) : (
                  reports?.map((r) => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="px-6 py-4 font-medium flex items-center">
                        <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />
                        {format(parseISO(r.report_date), 'dd/MM/yyyy', { locale: vi })}
                      </td>
                      <td className="px-6 py-4 text-center">{r.total_comments}</td>
                      <td className="px-6 py-4 text-center text-emerald-400 font-medium">{r.buy_intent_comments}</td>
                      <td className="px-6 py-4 text-center text-destructive">{r.negative_comments}</td>
                      <td className="px-6 py-4 text-center">{r.total_dms}</td>
                      <td className="px-6 py-4 text-center text-amber-400 font-medium">{r.escalated_dms}</td>
                      <td className="px-6 py-4 text-right">
                        <Badge variant={r.sent_at ? "success" : "outline"}>
                          {r.sent_at ? "Đã gửi" : "Chờ gửi"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
