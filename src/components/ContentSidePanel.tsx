import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, X as XIcon, CheckCircle2, Eye, Send } from "lucide-react";
import {
  ContentPost, ContentPlatform, ContentType, ContentStatus,
  CONTENT_TYPE_BY_PLATFORM, CONTENT_STATUS_LABELS,
  CONTENT_CREATORS,
} from "@/lib/types";
import { updatePost, deletePost, getTaskById } from "@/lib/store";
import { StatusPill, type StatusTone } from "@/components/pro";
import { toast } from "sonner";

// Cores sóbrias por plataforma (tokens) + mapa de status → tone do StatusPill
const PLATFORM_TONE: Record<ContentPlatform, string> = {
  Instagram: "hsl(var(--gold))",
  YouTube: "hsl(var(--danger))",
  TikTok: "hsl(var(--info))",
  Twitter: "hsl(var(--muted-foreground))",
};
const STATUS_TONE: Record<ContentStatus, StatusTone> = {
  rascunho: "neutral",
  aprovado: "info",
  agendado: "warning",
  publicado: "success",
};

interface Props {
  post: ContentPost | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onUpdate: () => void;
}

export function ContentSidePanel({ post, open, onOpenChange, onUpdate }: Props) {
  const [hashtagInput, setHashtagInput] = useState("");

  if (!post) return null;

  const save = (updates: Partial<ContentPost>) => {
    updatePost(post.id, updates);
    toast.success("Salvo", { duration: 1500 });
    onUpdate();
  };

  const handleDelete = () => {
    deletePost(post.id);
    toast.success("Post excluído");
    onOpenChange(false);
    onUpdate();
  };

  const handleAddHashtag = (tag: string) => {
    if (!tag.trim()) return;
    const formatted = tag.startsWith("#") ? tag.trim() : `#${tag.trim()}`;
    const hashtags = [...post.hashtags, formatted];
    save({ hashtags });
    setHashtagInput("");
  };

  const handleRemoveHashtag = (tag: string) => {
    const hashtags = post.hashtags.filter(h => h !== tag);
    save({ hashtags });
  };

  const linkedTask = post.linkedTaskId ? getTaskById(post.linkedTaskId) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[80%] sm:max-w-2xl bg-card border-border overflow-y-auto p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] rounded-sub border-border" style={{ color: PLATFORM_TONE[post.platform] }}>
              {post.platform}
            </Badge>
            <StatusPill label={CONTENT_STATUS_LABELS[post.status]} tone={STATUS_TONE[post.status]} className="text-[10px]" />
            <SheetTitle className="text-foreground flex-1">{post.title}</SheetTitle>
          </div>
        </SheetHeader>

        <div className="px-6 py-4 space-y-5">
          {/* Platform, Type, Creator */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1 block">Plataforma</label>
              <Select value={post.platform} onValueChange={v => save({ platform: v as ContentPlatform, type: CONTENT_TYPE_BY_PLATFORM[v as ContentPlatform][0] })}>
                <SelectTrigger className="bg-secondary/40 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["Instagram", "YouTube", "TikTok", "Twitter"] as ContentPlatform[]).map(p => (
                    <SelectItem key={p} value={p}><span style={{ color: PLATFORM_TONE[p] }}>{p}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1 block">Tipo</label>
              <Select value={post.type} onValueChange={v => save({ type: v as ContentType })}>
                <SelectTrigger className="bg-secondary/40 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPE_BY_PLATFORM[post.platform].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1 block">Creator</label>
              <Select value={post.creator} onValueChange={v => save({ creator: v })}>
                <SelectTrigger className="bg-secondary/40 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTENT_CREATORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1 block">Status</label>
            <Select value={post.status} onValueChange={v => save({ status: v as ContentStatus })}>
              <SelectTrigger className="bg-secondary/40 h-8 text-xs w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["rascunho", "aprovado", "agendado", "publicado"] as ContentStatus[]).map(s => (
                  <SelectItem key={s} value={s}><StatusPill label={CONTENT_STATUS_LABELS[s]} tone={STATUS_TONE[s]} dot={false} /></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date, Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1 block">Data</label>
              <Input type="date" defaultValue={post.scheduledDate} onBlur={e => save({ scheduledDate: e.target.value })} className="bg-secondary/40 h-8 text-xs" />
            </div>
            <div>
              <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1 block">Horário</label>
              <Input type="time" defaultValue={post.scheduledTime} onBlur={e => save({ scheduledTime: e.target.value })} className="bg-secondary/40 h-8 text-xs" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1 block">Descrição</label>
            <Textarea defaultValue={post.description} onBlur={e => save({ description: e.target.value })} className="bg-secondary/40 min-h-[60px] text-sm" />
          </div>

          <Separator />

          {/* Caption */}
          <div>
            <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1 block">Caption</label>
            <Textarea defaultValue={post.caption} onBlur={e => save({ caption: e.target.value })} className="bg-secondary/40 min-h-[80px] text-sm" placeholder="Texto da legenda..." />
          </div>

          {/* Hashtags */}
          <div>
            <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1.5 block">Hashtags</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {post.hashtags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-[10px] gap-1">
                  {tag}
                  <button onClick={() => handleRemoveHashtag(tag)} className="hover:text-destructive"><XIcon className="w-2.5 h-2.5" /></button>
                </Badge>
              ))}
            </div>
            <Input
              value={hashtagInput}
              onChange={e => setHashtagInput(e.target.value)}
              placeholder="Adicionar hashtag (Enter)"
              className="bg-secondary/40 h-7 text-xs"
              onKeyDown={e => {
                if (e.key === "Enter") {
                  handleAddHashtag(hashtagInput);
                }
              }}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1 block">Notas</label>
            <Textarea defaultValue={post.notes} onBlur={e => save({ notes: e.target.value })} className="bg-secondary/40 min-h-[50px] text-sm" />
          </div>

          <Separator />

          {/* Linked Task */}
          {linkedTask && (
            <div>
              <label className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1 block">Tarefa vinculada</label>
              <div className="flex items-center gap-2 text-xs bg-secondary/40 rounded px-2 py-1.5">
                <span className="font-mono text-gold">#{linkedTask.id}</span>
                <span className="flex-1 truncate">{linkedTask.title}</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {post.status === "rascunho" && (
              <Button size="sm" onClick={() => save({ status: "aprovado" })} className="text-xs gap-1 bg-gold text-primary-foreground">
                <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
              </Button>
            )}
            {post.status === "aprovado" && (
              <Button size="sm" onClick={() => save({ status: "agendado" })} className="text-xs gap-1 bg-warning text-primary-foreground hover:bg-warning/90">
                <Send className="w-3.5 h-3.5" /> Agendar
              </Button>
            )}
            {(post.status === "agendado" || post.status === "aprovado") && (
              <Button size="sm" onClick={() => save({ status: "publicado" })} className="text-xs gap-1 bg-success text-primary-foreground hover:bg-success/90">
                <Eye className="w-3.5 h-3.5" /> Marcar publicado
              </Button>
            )}
          </div>

          {/* Delete */}
          <div className="pt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-destructive hover:text-destructive text-xs gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Excluir post
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir post?</AlertDialogTitle>
                  <AlertDialogDescription>Esta ação não pode ser desfeita. O post "{post.title}" será removido permanentemente.</AlertDialogDescription>
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
