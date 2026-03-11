import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Trash2, X as XIcon, Paperclip, FileText, Link2, ExternalLink, Plus, Zap } from "lucide-react";
import { Task, TaskStatus, TaskPriority, TEAM_MEMBERS, AREAS, AREA_COLORS, STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, TaskAttachment } from "@/lib/types";
import { updateTask, deleteTask, logActivity, getUser, getActivities, uploadFile, getCampaigns } from "@/lib/store";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import confetti from "canvas-confetti";

interface Props {
  task: Task | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onUpdate: () => void;
}

export function TaskSidePanel({ task, open, onOpenChange, onUpdate }: Props) {
  const userName = getUser() || "";
  const [addingLink, setAddingLink] = useState(false);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  if (!task) return null;

  const save = (field: string, updates: Partial<Task>) => {
    const oldTask = task;
    updateTask(task.id, updates);
    logActivity({ taskId: task.id, taskTitle: task.title, userName, action: `field_update:${field}`, oldValue: null, newValue: null });
    
    if (updates.status === "concluida" && oldTask.status !== "concluida") {
      confetti({ particleCount: 80, spread: 60, colors: ["#D4A843", "#F5D77A", "#22C55E", "#6366F1"], origin: { y: 0.6 } });
    }
    toast.success("Salvo", { duration: 1500 });
    onUpdate();
  };

  const handleDelete = () => {
    deleteTask(task.id);
    logActivity({ taskId: task.id, taskTitle: task.title, userName, action: "task_deleted", oldValue: task.title, newValue: null });
    toast.success("Tarefa excluída");
    onOpenChange(false);
    onUpdate();
  };

  const handleAddTag = (tag: string) => {
    const tags = [...(task.tags || []), tag];
    save("tags", { tags });
  };

  const handleRemoveTag = (tag: string) => {
    const tags = (task.tags || []).filter(t => t !== tag);
    save("tags", { tags });
  };

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file, task.id);
    if (result) {
      const attachments = [...(task.attachments || []), { name: result.name, data: result.url, type: file.type }];
      save("attachment", { attachments });
    }
    e.target.value = "";
  };

  const handleAddLink = () => {
    if (!linkLabel.trim() || !linkUrl.trim()) return;
    const attachments: TaskAttachment[] = [...(task.attachments || []), { name: linkLabel.trim(), data: "", type: "link", label: linkLabel.trim(), url: linkUrl.trim() }];
    save("attachment", { attachments });
    setLinkLabel("");
    setLinkUrl("");
    setAddingLink(false);
  };

  const handleRemoveAttachment = (index: number) => {
    const attachments = (task.attachments || []).filter((_, i) => i !== index);
    save("attachment", { attachments });
  };

  const fileAttachments = (task.attachments || []).filter(a => a.type !== "link");
  const linkAttachments = (task.attachments || []).filter(a => a.type === "link" || a.url);

  const taskActivities = getActivities().filter(a => a.taskId === task.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[80%] sm:max-w-2xl bg-card border-border overflow-y-auto p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-gold">#{task.id}</span>
            <SheetTitle className="text-foreground flex-1">{task.title}</SheetTitle>
          </div>
          {task.campanha_id && (() => {
            const c = getCampaigns().find(x => x.id === task.campanha_id);
            return c ? (
              <div className="flex items-center gap-1.5 mt-1">
                <Zap className="w-3 h-3 text-gold" />
                <span className="text-xs text-gold font-medium">{c.title}</span>
                <Badge variant="outline" className="text-[9px] border-gold/30 text-gold">{c.status === "ativa" ? "Ativa" : c.status}</Badge>
              </div>
            ) : null;
          })()}
        </SheetHeader>

        <div className="px-6 py-4 space-y-5">
          {/* Status, Priority, Area */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1 block">Status</label>
              <Select value={task.status} onValueChange={v => save("status", { status: v as TaskStatus })}>
                <SelectTrigger className="bg-secondary/40 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as TaskStatus[]).map(s => (
                    <SelectItem key={s} value={s}><span style={{ color: STATUS_COLORS[s] }}>{STATUS_LABELS[s]}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1 block">Prioridade</label>
              <Select value={task.priority} onValueChange={v => save("priority", { priority: v as TaskPriority })}>
                <SelectTrigger className="bg-secondary/40 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map(p => (
                    <SelectItem key={p} value={p}><span style={{ color: PRIORITY_COLORS[p] }}>{PRIORITY_LABELS[p]}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1 block">Área</label>
              <Select value={task.area} onValueChange={v => save("area", { area: v })}>
                <SelectTrigger className="bg-secondary/40 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AREAS.map(a => <SelectItem key={a} value={a}><span style={{ color: AREA_COLORS[a] }}>{a}</span></SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Responsible */}
          <div>
            <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1.5 block">Responsáveis</label>
            <div className="flex flex-wrap gap-1.5">
              {TEAM_MEMBERS.map(m => (
                <button key={m}
                  onClick={() => {
                    const r = task.responsible.includes(m) ? task.responsible.filter(x => x !== m) : [...task.responsible, m];
                    save("responsible", { responsible: r });
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs border transition-all ${task.responsible.includes(m) ? "border-gold/50 text-gold bg-accent/40" : "border-border text-muted-foreground"}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1 block">Vencimento</label>
            <Input type="date" defaultValue={task.dueDate || ""} onBlur={e => save("dueDate", { dueDate: e.target.value || null })} className="bg-secondary/40 h-8 text-xs w-48" />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1 block">Descrição</label>
            <Textarea defaultValue={task.detail} onBlur={e => save("detail", { detail: e.target.value })} className="bg-secondary/40 min-h-[60px] text-sm" />
          </div>

          <Separator />

          {/* Decision */}
          <div>
            <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1 block">Decisão registrada</label>
            <Input defaultValue={task.decision || ""} onBlur={e => save("decision", { decision: e.target.value || null })} className="bg-secondary/40 text-sm" />
            {task.decision && <Badge className="mt-1.5 bg-gold/10 text-gold border-gold/20 text-[10px]">{task.decision}</Badge>}
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1 block">Notas</label>
            <Textarea defaultValue={task.notes} onBlur={e => save("notes", { notes: e.target.value })} className="bg-secondary/40 min-h-[50px] text-sm" />
          </div>

          <Separator />

          {/* Tags */}
          <div>
            <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1.5 block">Tags</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {(task.tags || []).map(tag => (
                <Badge key={tag} variant="secondary" className="text-[10px] gap-1">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive"><XIcon className="w-2.5 h-2.5" /></button>
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Adicionar tag (Enter)"
              className="bg-secondary/40 h-7 text-xs"
              onKeyDown={e => {
                if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                  handleAddTag((e.target as HTMLInputElement).value.trim());
                  (e.target as HTMLInputElement).value = "";
                }
              }}
            />
          </div>

          {/* File Attachments */}
          <div>
            <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1.5 block">Documentos</label>
            <div className="space-y-1 mb-2">
              {fileAttachments.map((att, i) => {
                const realIndex = (task.attachments || []).indexOf(att);
                return (
                  <div key={i} className="flex items-center gap-2 text-xs bg-secondary/40 rounded px-2 py-1.5">
                    <FileText className="w-3.5 h-3.5 text-gold shrink-0" />
                    <a href={att.data} download={att.name} className="text-gold hover:underline truncate flex-1">{att.name}</a>
                    <button onClick={() => handleRemoveAttachment(realIndex)} className="text-muted-foreground hover:text-destructive"><XIcon className="w-3 h-3" /></button>
                  </div>
                );
              })}
            </div>
            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border border-border text-muted-foreground hover:text-foreground hover:border-gold/30 transition-all cursor-pointer">
              <Paperclip className="w-3.5 h-3.5" /> Anexar documento
              <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.md,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg" onChange={handleFileAttach} />
            </label>
          </div>

          {/* Link Attachments */}
          <div>
            <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1.5 block">Anexos (Links)</label>
            <div className="space-y-1 mb-2">
              {linkAttachments.map((att, i) => {
                const realIndex = (task.attachments || []).indexOf(att);
                return (
                  <div key={i} className="flex items-center gap-2 text-xs bg-secondary/40 rounded px-2 py-1.5">
                    <Link2 className="w-3.5 h-3.5 text-gold shrink-0" />
                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline truncate flex-1">
                      {att.label || att.name}
                    </a>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-gold">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>Abrir link</TooltipContent>
                    </Tooltip>
                    <button onClick={() => handleRemoveAttachment(realIndex)} className="text-muted-foreground hover:text-destructive"><XIcon className="w-3 h-3" /></button>
                  </div>
                );
              })}
            </div>
            {addingLink ? (
              <div className="space-y-1.5 p-2 bg-secondary/20 rounded-md border border-border">
                <Input placeholder="Label (ex: Documento RTD)" value={linkLabel} onChange={e => setLinkLabel(e.target.value)} className="bg-secondary/40 h-7 text-xs" />
                <Input placeholder="URL (https://...)" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="bg-secondary/40 h-7 text-xs" />
                <div className="flex gap-1.5">
                  <Button size="sm" onClick={handleAddLink} disabled={!linkLabel.trim() || !linkUrl.trim()} className="h-6 text-[10px] gradient-gold text-primary-foreground">Salvar</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAddingLink(false); setLinkLabel(""); setLinkUrl(""); }} className="h-6 text-[10px]">Cancelar</Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingLink(true)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border border-border text-muted-foreground hover:text-foreground hover:border-gold/30 transition-all">
                <Plus className="w-3.5 h-3.5" /> Adicionar Link
              </button>
            )}
          </div>

          {/* Dependencies */}
          {task.dependencies.length > 0 && (
            <div>
              <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1 block">Dependências</label>
              <div className="flex gap-1">
                {task.dependencies.map(d => (
                  <Badge key={d} variant="outline" className="font-mono text-gold text-[10px]">#{d}</Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* History */}
          <div>
            <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-2 block">Histórico</label>
            {taskActivities.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma atividade registrada</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {taskActivities.slice(0, 20).map(a => (
                  <div key={a.id} className="flex items-start gap-2 text-xs">
                    <div className="w-5 h-5 rounded-full bg-secondary border border-border flex items-center justify-center text-[8px] font-bold text-gold shrink-0">{a.userName.charAt(0)}</div>
                    <div className="flex-1">
                      <span className="text-gold">{a.userName}</span>{" "}
                      <span className="text-muted-foreground">{a.action}</span>
                    </div>
                    <span className="text-[9px] font-mono text-muted-foreground">
                      {formatDistanceToNow(new Date(a.createdAt), { locale: ptBR, addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delete */}
          <div className="pt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-destructive hover:text-destructive text-xs gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Excluir tarefa
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
                  <AlertDialogDescription>Esta ação não pode ser desfeita. A tarefa #{task.id} será removida permanentemente.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
