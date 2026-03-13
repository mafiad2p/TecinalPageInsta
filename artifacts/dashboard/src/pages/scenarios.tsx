import { useState } from "react";
import { useScenarios, useCreateScenario, useDeleteScenario, Scenario } from "@/hooks/use-scenarios";
import { Card, CardContent } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button-custom";
import { Input, Textarea } from "@/components/ui/input-custom";
import { Badge } from "@/components/ui/badge-custom";
import { CustomDialog } from "@/components/ui/dialog-custom";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Zap } from "lucide-react";

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
      toast({ title: "Scenario created" });
      setIsModalOpen(false);
      setFormData({ name: "", triggerType: "GENERAL_INQUIRY", triggerKeywords: "", responseTemplate: "", actionType: "AUTO_REPLY", priority: 10 });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this scenario?")) {
      await deleteMut.mutateAsync(id);
      toast({ title: "Deleted" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">Automated rules and quick replies for specific intents.</p>
        <Button onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Scenario</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-muted-foreground bg-secondary/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Scenario Name</th>
                  <th className="px-6 py-4 font-medium">Trigger Intent</th>
                  <th className="px-6 py-4 font-medium">Action</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center">Loading...</td></tr>
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
                        <Badge variant="outline">{s.trigger_type}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={s.action_type.includes('ESCALATE') ? "warning" : "secondary"}>
                          {s.action_type.replace(/_/g, ' ')}
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
        title="Add Scenario"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Trigger Intent</label>
              <select 
                className="flex h-11 w-full rounded-xl border-2 border-border bg-background/50 px-3 py-2 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10"
                value={formData.triggerType}
                onChange={e => setFormData({...formData, triggerType: e.target.value})}
              >
                <option value="BUY_INTENT">Buy Intent</option>
                <option value="ORDER_TRACKING">Order Tracking</option>
                <option value="COMPLAINT">Complaint</option>
                <option value="GENERAL_INQUIRY">General</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <select 
                className="flex h-11 w-full rounded-xl border-2 border-border bg-background/50 px-3 py-2 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10"
                value={formData.actionType}
                onChange={e => setFormData({...formData, actionType: e.target.value})}
              >
                <option value="REPLY_AND_HIDE">Reply & Hide</option>
                <option value="AUTO_REPLY">Auto Reply</option>
                <option value="AUTO_REPLY_AND_ESCALATE">Reply & Escalate</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Response Template</label>
            <Textarea 
              value={formData.responseTemplate} 
              onChange={e => setFormData({...formData, responseTemplate: e.target.value})} 
              required 
              className="h-24"
            />
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createMut.isPending}>Save</Button>
          </div>
        </form>
      </CustomDialog>
    </div>
  );
}
