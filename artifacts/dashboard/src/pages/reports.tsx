import { useDailyReports, useGenerateReport } from "@/hooks/use-reports";
import { Card, CardContent } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button-custom";
import { Badge } from "@/components/ui/badge-custom";
import { useToast } from "@/hooks/use-toast";
import { Send, CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function Reports() {
  const { data: reports, isLoading } = useDailyReports();
  const generateMut = useGenerateReport();
  const { toast } = useToast();

  const handleGenerate = async () => {
    try {
      await generateMut.mutateAsync();
      toast({ title: "Report generated", description: "Sent to Telegram successfully." });
    } catch (error: any) {
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">Historical daily performance summaries sent to Telegram.</p>
        <Button onClick={handleGenerate} disabled={generateMut.isPending}>
          <Send className="w-4 h-4 mr-2" /> 
          {generateMut.isPending ? "Generating..." : "Generate Today's Report"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-muted-foreground bg-secondary/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium text-center">Comments</th>
                  <th className="px-6 py-4 font-medium text-center">Buy Intent</th>
                  <th className="px-6 py-4 font-medium text-center">Negative</th>
                  <th className="px-6 py-4 font-medium text-center">DMs</th>
                  <th className="px-6 py-4 font-medium text-center">Escalated</th>
                  <th className="px-6 py-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center">Loading...</td></tr>
                ) : reports?.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">No reports generated yet.</td></tr>
                ) : (
                  reports?.map((r) => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="px-6 py-4 font-medium flex items-center">
                        <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />
                        {format(parseISO(r.report_date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 text-center">{r.total_comments}</td>
                      <td className="px-6 py-4 text-center text-emerald-400 font-medium">{r.buy_intent_comments}</td>
                      <td className="px-6 py-4 text-center text-destructive">{r.negative_comments}</td>
                      <td className="px-6 py-4 text-center">{r.total_dms}</td>
                      <td className="px-6 py-4 text-center text-amber-400 font-medium">{r.escalated_dms}</td>
                      <td className="px-6 py-4 text-right">
                        <Badge variant={r.sent_at ? "success" : "outline"}>
                          {r.sent_at ? "Sent" : "Pending"}
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
