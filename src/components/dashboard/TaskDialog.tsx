import { useState } from "react";
import { Task, TaskStatus, TaskPriority, STATUS_LABELS, PRIORITY_LABELS, AREAS, TEAM_MEMBERS } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
  onSave: (data: Partial<Task>) => void;
}

export const TaskDialog = ({ open, onOpenChange, task, onSave }: TaskDialogProps) => {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [responsible, setResponsible] = useState<string[]>([]);
  const [priority, setPriority] = useState<TaskPriority>("media");
  const [area, setArea] = useState("Geral");
  const [status, setStatus] = useState<TaskStatus>("pendente");
  const [decision, setDecision] = useState("");

  // Reset form when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setTitle(task?.title || "");
      setDetail(task?.detail || "");
      setResponsible(task?.responsible || []);
      setPriority(task?.priority || "media");
      setArea(task?.area || "Geral");
      setStatus(task?.status || "pendente");
      setDecision(task?.decision || "");
    }
    onOpenChange(isOpen);
  };

  const toggleResponsible = (name: string) => {
    setResponsible(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      detail: detail.trim(),
      responsible,
      priority,
      area,
      status,
      decision: decision.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">Título *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 bg-secondary/50 border-border" />
          </div>

          <div>
            <Label className="text-sm text-muted-foreground">Detalhes</Label>
            <Textarea value={detail} onChange={e => setDetail(e.target.value)} className="mt-1 bg-secondary/50 border-border min-h-[80px]" />
          </div>

          <div>
            <Label className="text-sm text-muted-foreground">Responsáveis</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {TEAM_MEMBERS.map(name => (
                <label key={name} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={responsible.includes(name)}
                    onCheckedChange={() => toggleResponsible(name)}
                  />
                  <span className="text-sm">{name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm text-muted-foreground">Prioridade</Label>
              <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}>
                <SelectTrigger className="mt-1 bg-secondary/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Área</Label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger className="mt-1 bg-secondary/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={v => setStatus(v as TaskStatus)}>
              <SelectTrigger className="mt-1 bg-secondary/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground">Decisão</Label>
            <Input value={decision} onChange={e => setDecision(e.target.value)} placeholder="Decisão tomada..." className="mt-1 bg-secondary/50 border-border" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!title.trim()} className="gradient-gold text-primary-foreground">
              {task ? "Salvar" : "Criar Tarefa"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
