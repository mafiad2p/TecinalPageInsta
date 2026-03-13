import { useState } from "react";
import { useSystemLogs } from "@/hooks/use-logs";
import { Card, CardContent } from "@/components/ui/card-custom";
import { Badge } from "@/components/ui/badge-custom";
import { format, parseISO } from "date-fns";

export default function Logs() {
  const [level, setLevel] = useState<string>("all");
  const { data: logs, isLoading } = useSystemLogs(level);

  const getLevelBadge = (lvl: string) => {
    switch(lvl) {
      case 'error': return <Badge variant="destructive">ERROR</Badge>;
      case 'warn': return <Badge variant="warning">WARN</Badge>;
      case 'info': return <Badge variant="default" className="bg-blue-500/10 text-blue-400 border-blue-500/20">INFO</Badge>;
      default: return <Badge variant="outline">DEBUG</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">Real-time system events and error traces.</p>
        <select 
          className="flex h-10 w-[150px] rounded-xl border-2 border-border bg-card px-3 py-2 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10"
          value={level}
          onChange={e => setLevel(e.target.value)}
        >
          <option value="all">All Levels</option>
          <option value="error">Error</option>
          <option value="warn">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-muted-foreground bg-secondary/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-medium w-[180px]">Timestamp</th>
                  <th className="px-6 py-3 font-medium w-[100px]">Level</th>
                  <th className="px-6 py-3 font-medium w-[150px]">Service</th>
                  <th className="px-6 py-3 font-medium">Message</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {isLoading ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center font-sans text-sm text-muted-foreground">Loading logs...</td></tr>
                ) : logs?.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center font-sans text-sm text-muted-foreground">No logs match the criteria.</td></tr>
                ) : (
                  logs?.map((log) => (
                    <tr key={log.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">
                        {format(parseISO(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                      </td>
                      <td className="px-6 py-3">
                        {getLevelBadge(log.level)}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {log.service || 'core'}
                      </td>
                      <td className="px-6 py-3 text-foreground break-all">
                        {log.message}
                        {log.trace_id && <span className="text-muted-foreground ml-2">[{log.trace_id}]</span>}
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
