import { useState, useEffect, useCallback } from "react";
import { getPosts, createPost, updatePost, getUser, getCampaigns, CAMPAIGN_CONTENT_FILTER_KEY } from "@/lib/store";
import {
  ContentPost, ContentPlatform, ContentType, ContentStatus,
  PLATFORM_COLORS, CONTENT_TYPE_BY_PLATFORM, CONTENT_STATUS_COLORS, CONTENT_STATUS_LABELS,
  CONTENT_CREATORS,
} from "@/lib/types";
import { useRealtime } from "@/hooks/use-realtime";
import { ChevronLeft, ChevronRight, Plus, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ContentSidePanel } from "@/components/ContentSidePanel";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";

// ─── Draggable Post Chip ───
function DraggablePostChip({ post, onClick }: { post: ContentPost; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `post-${post.id}`,
    data: { post },
  });

  const style = transform ? {
    transform: `translate(${transform.x}px, ${transform.y}px)`,
    zIndex: 50,
    opacity: isDragging ? 0.7 : 1,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="flex items-center gap-1 px-1 py-0.5 rounded text-[9px] truncate cursor-grab active:cursor-grabbing hover:bg-secondary/50"
      title={`${post.platform} · ${post.type} · ${CONTENT_STATUS_LABELS[post.status]}`}
    >
      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PLATFORM_COLORS[post.platform] }} />
      <span className="truncate" style={{ color: PLATFORM_COLORS[post.platform] }}>{post.title}</span>
    </div>
  );
}

// ─── Droppable Day Cell ───
function DroppableDay({ dateStr, children }: { dateStr: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dateStr}` });
  return (
    <div ref={setNodeRef} className={`${isOver ? "ring-1 ring-gold/50" : ""}`}>
      {children}
    </div>
  );
}

// ─── Create/Edit Dialog ───
function PostFormDialog({
  open, onOpenChange, onSave, defaultDate,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onSave: (data: Omit<ContentPost, "id" | "createdAt" | "updatedAt">) => void;
  defaultDate: string;
}) {
  const userName = getUser() || "";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState<ContentPlatform>("Instagram");
  const [type, setType] = useState<ContentType>("Reels");
  const [creator, setCreator] = useState(CONTENT_CREATORS[0]);
  const [scheduledDate, setScheduledDate] = useState(defaultDate);
  const [scheduledTime, setScheduledTime] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtagInput, setHashtagInput] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<ContentStatus>("rascunho");

  useEffect(() => {
    if (open) {
      setTitle(""); setDescription(""); setPlatform("Instagram"); setType("Reels");
      setCreator(CONTENT_CREATORS[0]); setScheduledDate(defaultDate); setScheduledTime("");
      setCaption(""); setHashtags([]); setNotes(""); setStatus("rascunho"); setHashtagInput("");
    }
  }, [open, defaultDate]);

  const handlePlatformChange = (p: ContentPlatform) => {
    setPlatform(p);
    setType(CONTENT_TYPE_BY_PLATFORM[p][0]);
  };

  const addHashtag = () => {
    if (!hashtagInput.trim()) return;
    const formatted = hashtagInput.startsWith("#") ? hashtagInput.trim() : `#${hashtagInput.trim()}`;
    setHashtags(prev => [...prev, formatted]);
    setHashtagInput("");
  };

  const handleSave = (saveStatus: ContentStatus) => {
    if (!title.trim()) return;
    onSave({
      title, description, platform, type, creator, status: saveStatus,
      scheduledDate, scheduledTime, caption, hashtags, linkedTaskId: null, notes, createdBy: userName,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Nova Postagem</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Título *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-secondary/40 border-border" placeholder="Título da postagem" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-secondary/40 border-border min-h-[50px]" placeholder="Descrição breve..." />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Plataforma</Label>
              <Select value={platform} onValueChange={v => handlePlatformChange(v as ContentPlatform)}>
                <SelectTrigger className="bg-secondary/40 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["Instagram", "YouTube", "TikTok", "Twitter"] as ContentPlatform[]).map(p => (
                    <SelectItem key={p} value={p}><span style={{ color: PLATFORM_COLORS[p] }}>{p}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={type} onValueChange={v => setType(v as ContentType)}>
                <SelectTrigger className="bg-secondary/40 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPE_BY_PLATFORM[platform].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Creator</Label>
              <Select value={creator} onValueChange={setCreator}>
                <SelectTrigger className="bg-secondary/40 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTENT_CREATORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Data</Label>
              <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="bg-secondary/40 h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Horário</Label>
              <Input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="bg-secondary/40 h-8 text-xs" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Caption</Label>
            <Textarea value={caption} onChange={e => setCaption(e.target.value)} className="bg-secondary/40 border-border min-h-[60px]" placeholder="Texto da legenda..." />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Hashtags</Label>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {hashtags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                  {tag}
                  <button onClick={() => setHashtags(prev => prev.filter((_, j) => j !== i))} className="hover:text-destructive"><XIcon className="w-2.5 h-2.5" /></button>
                </Badge>
              ))}
            </div>
            <Input
              value={hashtagInput}
              onChange={e => setHashtagInput(e.target.value)}
              placeholder="Adicionar hashtag (Enter)"
              className="bg-secondary/40 h-7 text-xs"
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addHashtag(); } }}
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Notas</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="bg-secondary/40 border-border min-h-[40px]" placeholder="Notas internas..." />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={() => handleSave("rascunho")} disabled={!title.trim()} className="flex-1 text-xs" variant="outline">
              Salvar rascunho
            </Button>
            <Button onClick={() => handleSave("aprovado")} disabled={!title.trim()} className="flex-1 text-xs gradient-gold text-primary-foreground">
              Aprovar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───
const ContentPage = () => {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null);

  // Filters
  const [filterCreator, setFilterCreator] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCampaign, setFilterCampaign] = useState<string>("all");

  const campaigns = getCampaigns();

  // Cross-tab navigation: when coming from Campanhas → "Ver no Conteúdo"
  useEffect(() => {
    const savedFilter = localStorage.getItem(CAMPAIGN_CONTENT_FILTER_KEY);
    if (savedFilter) {
      setFilterCampaign(savedFilter);
      localStorage.removeItem(CAMPAIGN_CONTENT_FILTER_KEY);
    }
  }, []);

  const reload = useCallback(() => setPosts(getPosts()), []);
  useEffect(() => { reload(); }, [reload]);
  useRealtime(reload);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);

  // Apply filters
  const filteredPosts = posts.filter(p => {
    if (filterCreator !== "all" && p.creator !== filterCreator) return false;
    if (filterPlatform !== "all" && p.platform !== filterPlatform) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterCampaign !== "all" && p.campanha_id !== Number(filterCampaign)) return false;
    return true;
  });

  const getPostsForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return filteredPosts.filter(p => p.scheduledDate === dateStr);
  };

  const monthPostCount = filteredPosts.filter(p => {
    const d = new Date(p.scheduledDate);
    return d >= monthStart && d <= monthEnd;
  }).length;

  const handleDayClick = (day: Date) => {
    const dayPosts = getPostsForDay(day);
    if (dayPosts.length === 0) {
      setSelectedDate(format(day, "yyyy-MM-dd"));
      setDialogOpen(true);
    }
  };

  const handleSave = (data: Omit<ContentPost, "id" | "createdAt" | "updatedAt">) => {
    createPost(data);
    setDialogOpen(false);
    reload();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const dayId = over.id as string;
    if (!dayId.startsWith("day-")) return;
    const newDate = dayId.replace("day-", "");
    const postData = active.data.current?.post as ContentPost | undefined;
    if (postData && postData.scheduledDate !== newDate) {
      updatePost(postData.id, { scheduledDate: newDate });
      reload();
    }
  };

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Cronograma de Conteúdo</h1>
          <Badge variant="outline" className="text-xs border-gold/30 text-gold font-mono">
            {monthPostCount} post{monthPostCount !== 1 ? "s" : ""}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium capitalize min-w-[140px] text-center">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="h-8 w-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="text-xs text-gold border-gold/30 h-7">
            Hoje
          </Button>
          <Button size="sm" onClick={() => { setSelectedDate(format(new Date(), "yyyy-MM-dd")); setDialogOpen(true); }} className="text-xs gradient-gold text-primary-foreground h-7 gap-1">
            <Plus className="w-3.5 h-3.5" /> Novo post
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Select value={filterCreator} onValueChange={setFilterCreator}>
          <SelectTrigger className="bg-secondary/40 h-7 text-xs w-32"><SelectValue placeholder="Creator" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos creators</SelectItem>
            {CONTENT_CREATORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="bg-secondary/40 h-7 text-xs w-32"><SelectValue placeholder="Plataforma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {(["Instagram", "YouTube", "TikTok", "Twitter"] as ContentPlatform[]).map(p => (
              <SelectItem key={p} value={p}><span style={{ color: PLATFORM_COLORS[p] }}>{p}</span></SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="bg-secondary/40 h-7 text-xs w-32"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {(["rascunho", "aprovado", "agendado", "publicado"] as ContentStatus[]).map(s => (
              <SelectItem key={s} value={s}><span style={{ color: CONTENT_STATUS_COLORS[s] }}>{CONTENT_STATUS_LABELS[s]}</span></SelectItem>
            ))}
          </SelectContent>
        </Select>

        {campaigns.length > 0 && (
          <Select value={filterCampaign} onValueChange={setFilterCampaign}>
            <SelectTrigger className="bg-secondary/40 h-7 text-xs w-40"><SelectValue placeholder="Campanha" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas campanhas</SelectItem>
              {campaigns.map(c => (
                <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-3 mb-3">
        {(["Instagram", "YouTube", "TikTok", "Twitter"] as ContentPlatform[]).map(p => (
          <div key={p} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PLATFORM_COLORS[p] }} />
            {p}
          </div>
        ))}
      </div>

      {/* Calendar */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-7">
            {weekDays.map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-2 border-b border-border">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: startPadding }).map((_, i) => (
              <div key={`pad-${i}`} className="min-h-[80px] border-b border-r border-border bg-secondary/20" />
            ))}
            {days.map(day => {
              const dayPosts = getPostsForDay(day);
              const today = isToday(day);
              const isEmpty = dayPosts.length === 0;
              const dateStr = format(day, "yyyy-MM-dd");
              return (
                <DroppableDay key={dateStr} dateStr={dateStr}>
                  <div
                    onClick={() => handleDayClick(day)}
                    className={`min-h-[80px] border-b border-r border-border p-1.5 transition-colors ${today ? "bg-gold/5 border-gold/20" : ""} ${isEmpty ? "cursor-pointer hover:bg-secondary/30" : ""}`}
                  >
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-mono ${today ? "text-gold font-bold" : "text-muted-foreground"}`}>
                        {format(day, "d")}
                      </span>
                      {today && <span className="text-[8px] font-mono text-gold uppercase">hoje</span>}
                      {dayPosts.length > 0 && (
                        <span className="text-[8px] font-mono text-muted-foreground ml-auto">{dayPosts.length}</span>
                      )}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {dayPosts.slice(0, 3).map(p => (
                        <Tooltip key={p.id}>
                          <TooltipTrigger asChild>
                            <div>
                              <DraggablePostChip post={p} onClick={() => setSelectedPost(p)} />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-popover border-border text-xs">
                            <p className="font-medium">{p.title}</p>
                            <p className="text-muted-foreground">{p.platform} · {p.type} · {p.creator}</p>
                            <p style={{ color: CONTENT_STATUS_COLORS[p.status] }}>{CONTENT_STATUS_LABELS[p.status]}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      {dayPosts.length > 3 && (
                        <span className="text-[9px] text-muted-foreground px-1">+{dayPosts.length - 3}</span>
                      )}
                    </div>
                  </div>
                </DroppableDay>
              );
            })}
          </div>
        </div>
      </DndContext>

      <PostFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleSave} defaultDate={selectedDate} />
      <ContentSidePanel post={selectedPost} open={!!selectedPost} onOpenChange={b => { if (!b) setSelectedPost(null); }} onUpdate={() => { reload(); setSelectedPost(prev => prev ? getPosts().find(p => p.id === prev.id) || null : null); }} />
    </div>
  );
};

export default ContentPage;
