import { useState, useCallback, useEffect } from "react";
import { getCampaigns, createCampaign, updateCampaign, deleteCampaign, getPosts, getTasks, CAMPAIGN_CONTENT_FILTER_KEY } from "@/lib/store";
import { Campaign, CampaignStatus, CAMPAIGN_STATUS_COLORS, CAMPAIGN_STATUS_LABELS } from "@/lib/types";
import { useRealtime } from "@/hooks/use-realtime";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Zap, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampaignDetail } from "@/components/CampaignSidePanel";
import { CampaignFormDialog } from "@/components/CampaignFormDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

function fmtDate(d: string) {
  try { return format(new Date(d + "T12:00:00"), "dd/MM", { locale: ptBR }); } catch { return d; }
}

const STATUS_TABS: Array<CampaignStatus | "todas"> = ["todas", "ativa", "rascunho", "pausada", "encerrada"];
const STATUS_TAB_LABELS: Record<CampaignStatus | "todas", string> = {
  todas: "Todas", ativa: "Ativas", rascunho: "Rascunho", pausada: "Pausadas", encerrada: "Encerradas",
};

const CampaignsPage = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<CampaignStatus | "todas">("todas");
  const [search, setSearch] = useState("");

  const reload = useCallback(() => {
    const all = getCampaigns();
    setCampaigns(all);
    setSelected(prev => {
      if (prev) return all.find(c => c.id === prev.id) ?? (all[0] ?? null);
      return all[0] ?? null; // auto-select first
    });
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useRealtime(reload);

  const linkedPosts = (id: number) => getPosts().filter(p => p.campanha_id === id);
  const linkedTasks = (id: number) => getTasks().filter(t => t.campanha_id === id);

  const filtered = campaigns.filter(c => {
    if (filterStatus !== "todas" && c.status !== filterStatus) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) &&
        !c.concept.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = () => { setEditing(undefined); setDialogOpen(true); };
  const handleEdit = (c: Campaign) => { setEditing(c); setDialogOpen(true); };

  const handleSave = (data: Omit<Campaign, "id" | "createdAt" | "updatedAt">) => {
    if (editing) {
      updateCampaign(editing.id, data);
    } else {
      const created = createCampaign(data);
      setSelected(created);
    }
    setDialogOpen(false);
    reload();
  };

  const handleDelete = (c: Campaign) => {
    if (!confirm(`Excluir "${c.title}"?`)) return;
    deleteCampaign(c.id);
    if (selected?.id === c.id) setSelected(null);
    reload();
  };

  const handleNavigateToContent = (campaignId: number) => {
    localStorage.setItem(CAMPAIGN_CONTENT_FILTER_KEY, String(campaignId));
    navigate("/content");
  };

  return (
    <div className="flex flex-col md:flex-row gap-0 -mx-4 md:-mx-6 -mt-4 md:-mt-6 md:h-screen md:overflow-hidden">

      {/* ── LEFT: Campaign List ── */}
      <div className={cn(
        "w-full md:w-[260px] md:shrink-0 border-b md:border-b-0 md:border-r border-border flex-col bg-sidebar md:overflow-hidden",
        selected ? "hidden md:flex" : "flex",
      )}>
        <div className="px-4 pt-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-bold text-foreground">Campanhas</h1>
            <Button onClick={handleCreate} size="sm" className="h-7 text-xs gap-1 gradient-gold text-primary-foreground px-2.5">
              <Plus className="w-3.5 h-3.5" /> Nova
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..." className="pl-8 h-7 text-xs bg-secondary/40 border-border" />
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 px-3 pt-2 pb-1 flex-wrap">
          {STATUS_TABS.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap transition-colors font-medium",
                filterStatus === s
                  ? "bg-gold/20 text-gold border border-gold/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              )}>
              {STATUS_TAB_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Campaign items */}
        <div className="flex-1 overflow-y-auto py-1 max-h-[60vh] md:max-h-none">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4">
              <Zap className="w-7 h-7 text-muted-foreground/20 mb-2" />
              <p className="text-xs text-muted-foreground text-center">Nenhuma campanha</p>
              <Button onClick={handleCreate} size="sm" variant="ghost" className="mt-2 text-xs text-gold h-7">
                + Criar
              </Button>
            </div>
          ) : filtered.map(c => {
            const sc = CAMPAIGN_STATUS_COLORS[c.status];
            const isActive = selected?.id === c.id;
            return (
              <button key={c.id} onClick={() => setSelected(c)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-border/40 transition-all",
                  isActive ? "bg-gold/5 border-l-[3px] border-l-gold" : "hover:bg-secondary/30 border-l-[3px] border-l-transparent"
                )}>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: sc }} />
                  <span className="text-[10px] font-semibold" style={{ color: sc }}>{CAMPAIGN_STATUS_LABELS[c.status]}</span>
                  <span className="text-[9px] text-muted-foreground ml-auto font-mono">{fmtDate(c.startDate)}→{fmtDate(c.endDate)}</span>
                </div>
                <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">{c.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate italic">{c.concept}</p>
                <div className="flex gap-2 mt-1.5 text-[9px] text-muted-foreground">
                  <span>{c.phases.length} fases</span><span>·</span>
                  <span>{c.angles.length} ângulos</span><span>·</span>
                  <span>{(c.ads?.length ?? 0) + (c.videos?.length ?? 0)} roteiros</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-4 py-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground">{campaigns.length} campanha{campaigns.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* ── RIGHT: Detail ── */}
      <div className={cn("flex-1 overflow-y-auto bg-background", !selected && "hidden md:block")}>
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key={selected.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {/* Mobile back button */}
              <button
                onClick={() => setSelected(null)}
                className="md:hidden flex items-center gap-1.5 text-xs text-muted-foreground px-4 pt-4 pb-2 hover:text-foreground transition-colors"
              >
                ← Campanhas
              </button>
              <CampaignDetail
                campaign={selected}
                linkedPosts={linkedPosts(selected.id)}
                linkedTasks={linkedTasks(selected.id)}
                onEdit={() => handleEdit(selected)}
                onDelete={() => handleDelete(selected)}
                onNavigateToContent={() => handleNavigateToContent(selected.id)}
              />
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8">
              <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center mb-4 opacity-20">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Selecione uma campanha</p>
              <Button onClick={handleCreate} size="sm" className="mt-4 gap-1.5 gradient-gold text-primary-foreground text-xs">
                <Plus className="w-3.5 h-3.5" /> Nova campanha
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <CampaignFormDialog open={dialogOpen} onOpenChange={setDialogOpen} campaign={editing} onSave={handleSave} />
    </div>
  );
};

export default CampaignsPage;
