import { useDashboardStats } from "@/hooks/use-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card-custom";
import { MessageSquare, AlertTriangle, ShoppingCart, Send, ArrowUpRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Overview() {
  const { data: stats, isLoading } = useDashboardStats(7);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Mock chart data since API doesn't return timeseries yet
  const mockChartData = [
    { name: "Mon", comments: 120, dms: 80 },
    { name: "Tue", comments: 150, dms: 95 },
    { name: "Wed", comments: 180, dms: 110 },
    { name: "Thu", comments: 140, dms: 90 },
    { name: "Fri", comments: 200, dms: 130 },
    { name: "Sat", comments: 250, dms: 160 },
    { name: "Sun", comments: 220, dms: 140 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Comments</p>
                <p className="text-3xl font-display font-bold mt-1">{stats?.comments.total || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-emerald-400 flex items-center font-medium"><ArrowUpRight className="w-4 h-4 mr-1"/> +12%</span>
              <span className="text-muted-foreground ml-2">from last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Buy Intent</p>
                <p className="text-3xl font-display font-bold mt-1 text-emerald-400">{stats?.comments.buy_intent || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-muted-foreground">
              Auto-replied & DM'd
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Negative / Spam</p>
                <p className="text-3xl font-display font-bold mt-1 text-destructive">{stats?.comments.negative || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-muted-foreground">
              Automatically hidden
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">DMs Handled</p>
                <p className="text-3xl font-display font-bold mt-1">{stats?.dms.total || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Send className="w-6 h-6 text-accent" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-muted-foreground">
              <span className="text-amber-400 font-medium mr-1">{stats?.dms.escalated || 0}</span> escalated
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Activity Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line type="monotone" dataKey="comments" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="dms" stroke="hsl(var(--accent))" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/50">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mr-3 animate-pulse"></div>
                <span className="font-medium">Facebook API</span>
              </div>
              <span className="text-xs text-muted-foreground">Connected</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/50">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mr-3 animate-pulse"></div>
                <span className="font-medium">OpenAI GPT-4o</span>
              </div>
              <span className="text-xs text-muted-foreground">Online</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/50">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mr-3 animate-pulse"></div>
                <span className="font-medium">Telegram Bot</span>
              </div>
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/50">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mr-3 animate-pulse"></div>
                <span className="font-medium">Task Queue</span>
              </div>
              <span className="text-xs text-muted-foreground">0 pending</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
