import { useState, useEffect, useCallback, useMemo } from "react";
import { getRevendedores, createRevendedor, updateRevendedor, deleteRevendedor, logActivity, getUser, calcScore } from "@/lib/store";
import {
  Revendedor, RevendedorStatus, RevendedorCanal, InteracaoTipo, Interacao,
  REVENDEDOR_STATUS_COLORS, TEAM_MEMBERS, INTERACAO_ICONS,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Plus, Pencil, Trash2, Building2, Search, Users, TrendingUp, Package,
  List, Columns3, BarChart3, Phone, Mail, Instagram, MessageCircle,
  X, Calendar, ChevronLeft, ChevronRight, AlertTriangle, ArrowUpDown,
  ExternalLink, Check, Filter, Trophy, TrendingDown, Eye,
  Download, Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useRealtime } from "@/hooks/use-realtime";
import { format, formatDistanceToNow, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
  Area, AreaChart,
} from "recharts";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";

const safeDiffDays = (dateStr: string) => { try { const d = parseISO(dateStr); return isNaN(d.getTime()) ? 999 : differenceInDays(new Date(), d); } catch { return 999; } };

const CANAIS: RevendedorCanal[] = ["WhatsApp", "Instagram", "Indicação", "Outros"];
const ALL_STATUSES: RevendedorStatus[] = ["Novo Lead", "Em Negociação", "Ativo", "Recorrente", "Inativo"];
const PIPELINE_COLS: RevendedorStatus[] = ["Novo Lead", "Em Negociação", "Ativo", "Recorrente"];
const INTERACAO_TIPOS: InteracaoTipo[] = ["WhatsApp", "Ligação", "Reunião", "Email", "Visita", "Outro"];

type ViewMode = "lista" | "pipeline" | "analytics";
type SortField = "nome" | "volume" | "score" | "ultima";
type SortDir = "asc" | "desc";

const CHART_COLORS = ["#22C55E", "#3B82F6", "#F59E0B", "#8B5CF6", "#6B7280"];

// ─── Score color helper ───
function scoreColor(s: number) {
  if (s >= 70) return "#22C55E";
  if (s >= 40) return "#F59E0B";
  return "#EF4444";
}

// ─── Mini sparkline via SVG ───
function Sparkline({ data, color = "hsl(var(--gold))", w = 60, h = 20 }: { data: number[]; color?: string; w?: number; h?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="inline-block ml-1">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Avatar ───
function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <div
      className="rounded-full bg-secondary border border-border flex items-center justify-center font-bold text-gold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {name.charAt(0)}
    </div>
  );
}

// ═══════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════
const RevendedoresPage = () => {
  const [revs, setRevs] = useState<Revendedor[]>([]);
  const [view, setView] = useState<ViewMode>("lista");
  const [search, setSearch] = useState("");
  const [filterResp, setFilterResp] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCanal, setFilterCanal] = useState("all");
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newDialogPreStatus, setNewDialogPreStatus] = useState<RevendedorStatus | undefined>();
  const [selected, setSelected] = useState<Revendedor | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("nome");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const userName = getUser() || "";

  const reload = useCallback(() => setRevs(getRevendedores()), []);
  useEffect(() => { reload(); }, [reload]);
  useRealtime(reload);

  // Apply filters
  const filtered = useMemo(() => {
    let list = revs;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.nome.toLowerCase().includes(q) ||
        r.cidade.toLowerCase().includes(q) ||
        (r.instagram || "").toLowerCase().includes(q) ||
        (r.whatsapp || "").includes(q)
      );
    }
    if (filterResp !== "all") list = list.filter(r => r.responsavel === filterResp);
    if (filterStatus !== "all") list = list.filter(r => r.status === filterStatus);
    if (filterCanal !== "all") list = list.filter(r => r.canal === filterCanal);
    // Sort
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "nome") cmp = a.nome.localeCompare(b.nome);
      else if (sortField === "volume") cmp = a.volume - b.volume;
      else if (sortField === "score") cmp = a.score - b.score;
      else if (sortField === "ultima") cmp = a.ultima.localeCompare(b.ultima);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [revs, search, filterResp, filterStatus, filterCanal, sortField, sortDir]);

  const clearFilters = () => {
    setSearch(""); setFilterResp("all"); setFilterStatus("all"); setFilterCanal("all");
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const handleSaveNew = (data: Omit<Revendedor, "id">) => {
    data.score = calcScore(data);
    createRevendedor(data);
    logActivity({ taskId: 0, taskTitle: data.nome, userName, action: "revendedor_created", oldValue: null, newValue: data.nome });
    toast.success("Revendedor cadastrado");
    setNewDialogOpen(false);
    reload();
  };

  const handleUpdate = (id: string, updates: Partial<Revendedor>) => {
    const current = revs.find(r => r.id === id);
    if (!current) return;
    const merged = { ...current, ...updates };
    merged.score = calcScore(merged);
    updateRevendedor(id, { ...updates, score: merged.score });
    reload();
    // Refresh selected if open
    if (selected?.id === id) {
      setSelected({ ...merged });
    }
  };

  const handleDelete = (id: string) => {
    const rev = revs.find(r => r.id === id);
    deleteRevendedor(id);
    if (rev) logActivity({ taskId: 0, taskTitle: rev.nome, userName, action: "revendedor_deleted", oldValue: rev.nome, newValue: null });
    toast.success("Revendedor removido");
    if (selected?.id === id) setSelected(null);
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    reload();
  };

  const handleBulkStatus = (status: RevendedorStatus) => {
    selectedIds.forEach(id => handleUpdate(id, { status }));
    setSelectedIds(new Set());
    toast.success(`${selectedIds.size} atualizado(s)`);
  };

  const handleBulkResp = (resp: string) => {
    selectedIds.forEach(id => handleUpdate(id, { responsavel: resp }));
    setSelectedIds(new Set());
    toast.success(`Responsável atualizado`);
  };

  const handleBulkDelete = () => {
    selectedIds.forEach(id => handleDelete(id));
    setSelectedIds(new Set());
  };

  const handleExportCSV = () => {
    const rows = selectedIds.size > 0 ? filtered.filter(r => selectedIds.has(r.id)) : filtered;
    const header = "Nome,Responsável,Status,Canal,Cidade,Volume,Score,WhatsApp,Instagram,Email,Telefone,Tags,Observações,Última Atividade\n";
    const csv = header + rows.map(r =>
      `"${r.nome}","${r.responsavel}","${r.status}","${r.canal}","${r.cidade}",${r.volume},${r.score},"${r.whatsapp}","${r.instagram}","${r.email}","${r.telefone}","${(r.tags || []).join("; ")}","${r.obs}","${r.ultima}"`
    ).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "crm_revendedores.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} revendedor(es) exportado(s)`);
  };

  const handleExportXLSX = () => {
    const rows = selectedIds.size > 0 ? filtered.filter(r => selectedIds.has(r.id)) : filtered;
    const data = rows.map(r => ({
      Nome: r.nome,
      Responsável: r.responsavel,
      Status: r.status,
      Canal: r.canal,
      Cidade: r.cidade,
      Volume: r.volume,
      Score: r.score,
      WhatsApp: r.whatsapp,
      Instagram: r.instagram,
      Email: r.email,
      Telefone: r.telefone,
      Tags: (r.tags || []).join("; "),
      Observações: r.obs,
      "Última Atividade": r.ultima,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    // Auto-size columns
    const colWidths = Object.keys(data[0] || {}).map(k => ({
      wch: Math.max(k.length, ...data.map(d => String((d as any)[k] || "").length).slice(0, 50)) + 2
    }));
    ws["!cols"] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CRM");
    XLSX.writeFile(wb, "crm_revendedores.xlsx");
    toast.success(`${rows.length} revendedor(es) exportado(s) para Excel`);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);
        let count = 0;
        rows.forEach(row => {
          const nome = row["Nome"] || row["nome"] || row["NOME"] || "";
          if (!nome) return;
          const newRev: Omit<Revendedor, "id"> = {
            nome,
            responsavel: row["Responsável"] || row["responsavel"] || row["Responsavel"] || "Pedro",
            status: (row["Status"] || row["status"] || "Novo Lead") as RevendedorStatus,
            canal: (row["Canal"] || row["canal"] || "WhatsApp") as RevendedorCanal,
            cidade: row["Cidade"] || row["cidade"] || "",
            volume: Number(row["Volume"] || row["volume"] || 0),
            score: 0,
            whatsapp: String(row["WhatsApp"] || row["whatsapp"] || row["Whatsapp"] || ""),
            instagram: row["Instagram"] || row["instagram"] || "",
            email: row["Email"] || row["email"] || "",
            telefone: String(row["Telefone"] || row["telefone"] || row["WhatsApp"] || row["whatsapp"] || ""),
            tags: (row["Tags"] || row["tags"] || "").toString().split(/[;,]/).map((t: string) => t.trim()).filter(Boolean),
            obs: row["Observações"] || row["obs"] || row["Obs"] || "",
            ultima: row["Última Atividade"] || row["ultima"] || format(new Date(), "yyyy-MM-dd"),
            proximaAcao: null,
            volumeHistorico: [],
            historico: [],
          };
          newRev.score = calcScore(newRev);
          createRevendedor(newRev);
          count++;
        });
        toast.success(`${count} revendedor(es) importado(s)`);
        reload();
      } catch (err) {
        toast.error("Erro ao importar arquivo. Verifique o formato.");
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  // Pipeline drag
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    // If dropped on a column header
    if (PIPELINE_COLS.includes(overId as RevendedorStatus)) {
      handleUpdate(String(active.id), { status: overId as RevendedorStatus });
      toast.success("Status atualizado");
    }
  };

  // Stats
  const byStatus = (s: RevendedorStatus) => revs.filter(r => r.status === s).length;
  const totalVolume = revs.reduce((sum, r) => sum + r.volume, 0);
  const pipelineVolume = revs.filter(r => r.status === "Novo Lead" || r.status === "Em Negociação").reduce((s, r) => s + r.volume, 0);
  const avgScore = revs.length ? Math.round(revs.reduce((s, r) => s + r.score, 0) / revs.length) : 0;
  const noContact30 = revs.filter(r => r.ultima && safeDiffDays(r.ultima) > 30).length;

  const heroStats = [
    {
      label: "Revendedores", value: revs.length, icon: Building2, color: "hsl(var(--gold))",
      sub: `${byStatus("Inativo")} inativos`,
    },
    {
      label: "Ativos & Recorrentes", value: byStatus("Ativo") + byStatus("Recorrente"), icon: Users, color: "#22C55E",
      sub: `${byStatus("Em Negociação")} em negociação`,
    },
    {
      label: "Volume Mensal", value: `${totalVolume.toLocaleString("pt-BR")} un`, icon: Package, color: "#D4A843",
      sub: `Pipeline: ${pipelineVolume.toLocaleString("pt-BR")} un`,
    },
    {
      label: "Score Médio", value: avgScore, icon: BarChart3, color: scoreColor(avgScore),
      sub: noContact30 > 0 ? `${noContact30} sem contato +30d ⚠` : "Todos monitorados ✓",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">CRM</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {revs.length} revendedores · <span className="text-gold font-mono font-semibold">{totalVolume.toLocaleString("pt-BR")}</span> un/mês
            {noContact30 > 0 && <span className="text-red-400 ml-2">· {noContact30} sem contato +30d</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportXLSX} className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1" /> Exportar
          </Button>
          <label>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} className="hidden" />
            <Button variant="outline" size="sm" asChild className="text-xs cursor-pointer">
              <span><Upload className="w-3.5 h-3.5 mr-1" /> Importar</span>
            </Button>
          </label>
          <Button onClick={() => { setNewDialogPreStatus(undefined); setNewDialogOpen(true); }} className="gradient-gold text-primary-foreground font-semibold glow-pulse" size="sm">
            <Plus className="w-4 h-4 mr-1" /> Novo Revendedor
          </Button>
        </div>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {heroStats.map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4 hover:border-gold/20 transition-all group">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs text-muted-foreground leading-tight">{s.label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${s.color}15` }}>
                <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome, cidade, instagram..." className="pl-8 h-8 text-sm bg-secondary/40" />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={filterResp} onValueChange={setFilterResp}>
            <SelectTrigger className="w-[120px] sm:w-[130px] h-8 text-xs bg-secondary/40"><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {TEAM_MEMBERS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[120px] sm:w-[140px] h-8 text-xs bg-secondary/40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCanal} onValueChange={setFilterCanal}>
            <SelectTrigger className="w-[110px] sm:w-[120px] h-8 text-xs bg-secondary/40"><SelectValue placeholder="Canal" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {CANAIS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {(search || filterResp !== "all" || filterStatus !== "all" || filterCanal !== "all") && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-muted-foreground">
              <X className="w-3 h-3 mr-1" /> Limpar
            </Button>
          )}
          <div className="flex border border-border rounded-md ml-auto">
            {([["lista", List], ["pipeline", Columns3], ["analytics", BarChart3]] as [ViewMode, any][]).map(([v, Icon]) => (
              <Button key={v} variant={view === v ? "secondary" : "ghost"} size="sm" className="h-8 w-8 p-0" onClick={() => setView(v)}>
                <Icon className="w-3.5 h-3.5" />
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-secondary/60 rounded-lg border border-border p-2 flex flex-wrap items-center gap-2"
          >
            <span className="text-xs font-medium">{selectedIds.size} selecionado(s)</span>
            <Select onValueChange={v => handleBulkStatus(v as RevendedorStatus)}>
              <SelectTrigger className="w-[140px] h-7 text-[11px]"><SelectValue placeholder="Mudar Status" /></SelectTrigger>
              <SelectContent>{ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select onValueChange={handleBulkResp}>
              <SelectTrigger className="w-[130px] h-7 text-[11px]"><SelectValue placeholder="Responsável" /></SelectTrigger>
              <SelectContent>{TEAM_MEMBERS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={handleExportCSV}>Exportar CSV</Button>
            <Button variant="destructive" size="sm" className="h-7 text-[11px]" onClick={handleBulkDelete}>Excluir</Button>
            <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setSelectedIds(new Set())}>
              <X className="w-3 h-3" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Views */}
      {view === "lista" && (
        <ListaView
          revs={filtered}
          selectedIds={selectedIds}
          onToggleSelect={(id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
          onSelectAll={() => { if (selectedIds.size === filtered.length) setSelectedIds(new Set()); else setSelectedIds(new Set(filtered.map(r => r.id))); }}
          onSort={handleSort}
          sortField={sortField}
          sortDir={sortDir}
          onSelect={setSelected}
          onEdit={(r) => setSelected(r)}
          onDelete={handleDelete}
        />
      )}
      {view === "pipeline" && (
        <PipelineView
          revs={revs}
          onDragEnd={handleDragEnd}
          onSelect={setSelected}
          onAddToCol={(status) => { setNewDialogPreStatus(status); setNewDialogOpen(true); }}
        />
      )}
      {view === "analytics" && <AnalyticsView revs={revs} />}

      {/* New Revendedor Dialog */}
      <NewRevendedorDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} preStatus={newDialogPreStatus} onSave={handleSaveNew} />

      {/* Detail Panel */}
      <Sheet open={!!selected} onOpenChange={b => { if (!b) setSelected(null); }}>
        <SheetContent className="w-full sm:w-[520px] sm:max-w-[520px] bg-card border-border overflow-y-auto p-0">
          {selected && (
            <DetailPanel
              rev={selected}
              onUpdate={(updates) => handleUpdate(selected.id, updates)}
              onClose={() => setSelected(null)}
              onDelete={() => handleDelete(selected.id)}
              userName={userName}
              reload={() => { reload(); const r = getRevendedores().find(x => x.id === selected.id); if (r) setSelected(r); }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

// ═══════════════════════════════════════════════
// VIEW: LISTA
// ═══════════════════════════════════════════════
function ListaView({ revs, selectedIds, onToggleSelect, onSelectAll, onSort, sortField, sortDir, onSelect, onEdit, onDelete }: {
  revs: Revendedor[]; selectedIds: Set<string>;
  onToggleSelect: (id: string) => void; onSelectAll: () => void;
  onSort: (f: SortField) => void; sortField: SortField; sortDir: SortDir;
  onSelect: (r: Revendedor) => void; onEdit: (r: Revendedor) => void; onDelete: (id: string) => void;
}) {
  const SortHeader = ({ field, children, className = "" }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <th className={`px-3 py-2.5 cursor-pointer hover:text-foreground transition-colors ${className}`} onClick={() => onSort(field)}>
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && <ArrowUpDown className="w-2.5 h-2.5" />}
      </div>
    </th>
  );

  return (
    <div className="bg-card rounded-lg border border-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-[10px] uppercase text-muted-foreground tracking-wider">
            <th className="px-3 py-2.5 w-8">
              <Checkbox checked={selectedIds.size === revs.length && revs.length > 0} onCheckedChange={onSelectAll} />
            </th>
            <SortHeader field="nome" className="text-left">Nome</SortHeader>
            <th className="text-left px-3 py-2.5 hidden sm:table-cell">Responsável</th>
            <th className="text-left px-3 py-2.5">Status</th>
            <th className="text-left px-3 py-2.5 hidden md:table-cell">Canal</th>
            <SortHeader field="score" className="text-left hidden md:table-cell">Score</SortHeader>
            <SortHeader field="volume" className="text-right">Vol./Mês</SortHeader>
            <th className="text-left px-3 py-2.5 hidden lg:table-cell">Próxima Ação</th>
            <SortHeader field="ultima" className="text-right hidden lg:table-cell">Última Ativ.</SortHeader>
            <th className="text-right px-3 py-2.5">Ações</th>
          </tr>
        </thead>
        <tbody>
          {revs.map(r => {
            const proxVencida = r.proximaAcao?.data && safeDiffDays(r.proximaAcao.data) > 0;
            return (
              <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/20 cursor-pointer transition-colors" onClick={() => onSelect(r)}>
                <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                  <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => onToggleSelect(r.id)} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={r.nome} size={30} />
                    <div className="min-w-0">
                      <span className="font-medium text-sm block truncate">{r.nome}</span>
                      <span className="text-[10px] text-muted-foreground block truncate">{r.cidade || "—"}</span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 hidden sm:table-cell">
                  <div className="flex items-center gap-1.5">
                    <Avatar name={r.responsavel} size={20} />
                    <span className="text-muted-foreground text-xs">{r.responsavel}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: REVENDEDOR_STATUS_COLORS[r.status] }} />
                    <span className="text-xs whitespace-nowrap" style={{ color: REVENDEDOR_STATUS_COLORS[r.status] }}>{r.status}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 hidden md:table-cell">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {r.canal === "WhatsApp" && <MessageCircle className="w-3 h-3" />}
                    {r.canal === "Instagram" && <Instagram className="w-3 h-3" />}
                    {r.canal}
                  </div>
                </td>
                <td className="px-3 py-2.5 hidden md:table-cell">
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${r.score}%`, backgroundColor: scoreColor(r.score) }} />
                    </div>
                    <span className="text-[10px] font-mono" style={{ color: scoreColor(r.score) }}>{r.score}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="font-mono text-xs font-medium">{r.volume}</span>
                    {Array.isArray(r.volumeHistorico) && r.volumeHistorico.length > 1 && (
                      <Sparkline data={r.volumeHistorico.map(v => v.volume)} w={40} h={14} />
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 hidden lg:table-cell">
                  {r.proximaAcao ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono">{r.proximaAcao.data ? format(parseISO(r.proximaAcao.data), "dd/MM") : "—"}</span>
                      {proxVencida && <Badge variant="destructive" className="text-[8px] px-1 py-0">vencida</Badge>}
                    </div>
                  ) : <span className="text-muted-foreground text-xs">—</span>}
                </td>
                <td className="px-3 py-2.5 text-right hidden lg:table-cell">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {r.ultima ? formatDistanceToNow(parseISO(r.ultima), { locale: ptBR, addSuffix: true }) : "—"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-end gap-0.5">
                    {r.whatsapp && (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => window.open(`https://wa.me/${r.whatsapp}`, "_blank")}>
                        <MessageCircle className="w-3 h-3 text-green-500" />
                      </Button>
                    )}
                    {r.instagram && (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => window.open(`https://instagram.com/${r.instagram.replace("@", "")}`, "_blank")}>
                        <Instagram className="w-3 h-3 text-purple-400" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Trash2 className="w-3 h-3 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader><AlertDialogTitle>Excluir revendedor?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(r.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {revs.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum revendedor encontrado</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// VIEW: PIPELINE (KANBAN)
// ═══════════════════════════════════════════════
function PipelineView({ revs, onDragEnd, onSelect, onAddToCol }: {
  revs: Revendedor[]; onDragEnd: (e: DragEndEvent) => void;
  onSelect: (r: Revendedor) => void; onAddToCol: (s: RevendedorStatus) => void;
}) {
  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PIPELINE_COLS.map(status => {
          const colRevs = revs.filter(r => r.status === status);
          const colVol = colRevs.reduce((s, r) => s + r.volume, 0);
          return (
            <div key={status} className="bg-card rounded-xl border border-border p-2.5" style={{ borderTopWidth: 3, borderTopColor: REVENDEDOR_STATUS_COLORS[status] }}>
              <div className="mb-3 px-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold" style={{ color: REVENDEDOR_STATUS_COLORS[status] }}>{status}</span>
                    <span className="text-[10px] font-mono bg-secondary/60 px-1 py-0.5 rounded text-muted-foreground">{colRevs.length}</span>
                  </div>
                  {colVol > 0 && <span className="text-[10px] font-mono text-gold">{colVol.toLocaleString("pt-BR")} un</span>}
                </div>
              </div>
              <SortableContext items={colRevs.map(r => r.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 min-h-[60px]" id={status}>
                  {colRevs.map(r => (
                    <PipelineCard key={r.id} rev={r} onSelect={onSelect} />
                  ))}
                </div>
              </SortableContext>
              <Button variant="ghost" size="sm" className="w-full mt-2 h-7 text-[11px] text-muted-foreground" onClick={() => onAddToCol(status)}>
                <Plus className="w-3 h-3 mr-1" /> Adicionar
              </Button>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}

function PipelineCard({ rev, onSelect }: { rev: Revendedor; onSelect: (r: Revendedor) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: rev.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-background rounded-lg border border-border p-3 cursor-grab hover:border-gold/30 hover:shadow-sm transition-all group"
      onClick={() => onSelect(rev)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={rev.nome} size={24} />
          <div className="min-w-0">
            <span className="font-medium text-xs block truncate">{rev.nome}</span>
            {rev.cidade && <span className="text-[9px] text-muted-foreground">{rev.cidade}</span>}
          </div>
        </div>
        {rev.whatsapp && (
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${rev.whatsapp}`, "_blank"); }}
          >
            <MessageCircle className="w-3.5 h-3.5 text-green-500" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] mb-2">
        <div className="flex items-center gap-1.5">
          <Avatar name={rev.responsavel} size={14} />
          <span className="text-muted-foreground">{rev.responsavel}</span>
        </div>
        <span className="font-mono text-gold font-semibold">{rev.volume} un</span>
      </div>

      {/* Score bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[9px] text-muted-foreground">
          <span>Score</span>
          <span style={{ color: scoreColor(rev.score) }}>{rev.score}</span>
        </div>
        <div className="h-1 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${rev.score}%`, backgroundColor: scoreColor(rev.score) }} />
        </div>
      </div>

      {rev.proximaAcao && (
        <div className="flex items-center gap-1 mt-2 text-[9px] text-muted-foreground border-t border-border pt-2">
          <Calendar className="w-2.5 h-2.5 text-gold" />
          <span>{rev.proximaAcao.data ? format(parseISO(rev.proximaAcao.data), "dd/MM") : "—"}</span>
          <span className="truncate opacity-75">· {rev.proximaAcao.descricao}</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// VIEW: ANALYTICS
// ═══════════════════════════════════════════════
function AnalyticsView({ revs }: { revs: Revendedor[] }) {
  // Chart 1: Top by volume
  const byVolume = [...revs].sort((a, b) => b.volume - a.volume);

  // Chart 2: Distribution by status
  const statusDist = ALL_STATUSES.map(s => ({ name: s, value: revs.filter(r => r.status === s).length })).filter(d => d.value > 0);

  // Chart 3: Volume evolution last 6 months
  const months = ["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"];
  const volEvolution = months.map(m => ({
    mes: m.slice(5),
    volume: revs.reduce((s, r) => s + ((Array.isArray(r.volumeHistorico) ? r.volumeHistorico : []).find(v => v.mes === m)?.volume || 0), 0),
  }));

  // Chart 4: Volume by responsável
  const byResp = TEAM_MEMBERS.map(m => ({
    name: m,
    volume: revs.filter(r => r.responsavel === m).reduce((s, r) => s + r.volume, 0),
  })).filter(d => d.volume > 0).sort((a, b) => b.volume - a.volume);

  // Performance cards
  const topPerformer = byVolume[0];
  const noContact = revs.filter(r => r.ultima && safeDiffDays(r.ultima) > 30);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1 */}
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-xs font-semibold mb-3 uppercase text-muted-foreground">Top Revendedores por Volume</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byVolume} layout="vertical" margin={{ left: 80 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis dataKey="nome" type="category" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={75} />
              <RTooltip contentStyle={{ backgroundColor: "hsl(240 20% 7%)", border: "1px solid hsl(240 18% 14%)", fontSize: 11 }} />
              <Bar dataKey="volume" radius={[0, 4, 4, 0]}>
                {byVolume.map((r, i) => (
                  <Cell key={r.id} fill={REVENDEDOR_STATUS_COLORS[r.status] || "#6B7280"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2 */}
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-xs font-semibold mb-3 uppercase text-muted-foreground">Distribuição por Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {statusDist.map((d, i) => (
                  <Cell key={d.name} fill={REVENDEDOR_STATUS_COLORS[d.name as RevendedorStatus] || CHART_COLORS[i]} />
                ))}
              </Pie>
              <RTooltip contentStyle={{ backgroundColor: "hsl(240 20% 7%)", border: "1px solid hsl(240 18% 14%)", fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3 */}
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-xs font-semibold mb-3 uppercase text-muted-foreground">Evolução Volume Total (6 meses)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={volEvolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 18% 14%)" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <RTooltip contentStyle={{ backgroundColor: "hsl(240 20% 7%)", border: "1px solid hsl(240 18% 14%)", fontSize: 11 }} />
              <Area type="monotone" dataKey="volume" stroke="hsl(var(--gold))" fill="hsl(var(--gold) / 0.15)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 4 */}
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-xs font-semibold mb-3 uppercase text-muted-foreground">Volume por Responsável</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byResp}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 18% 14%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <RTooltip contentStyle={{ backgroundColor: "hsl(240 20% 7%)", border: "1px solid hsl(240 18% 14%)", fontSize: 11 }} />
              <Bar dataKey="volume" fill="hsl(var(--gold))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {topPerformer && (
          <div className="bg-card rounded-lg border border-border p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Trophy className="w-3.5 h-3.5 text-gold" />
              <span className="text-[10px] uppercase text-muted-foreground">Top Performer</span>
            </div>
            <span className="font-semibold text-sm">{topPerformer.nome}</span>
            <span className="text-xs text-muted-foreground block">{topPerformer.volume} garrafas/mês</span>
          </div>
        )}
        <div className="bg-card rounded-lg border border-border p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[10px] uppercase text-muted-foreground">Maior Crescimento</span>
          </div>
          {(() => {
            const growth = revs.map(r => {
              const hist = r.volumeHistorico || [];
              if (hist.length < 2) return { ...r, growth: 0 };
              const last = hist[hist.length - 1]?.volume || 0;
              const prev = hist[hist.length - 2]?.volume || 1;
              return { ...r, growth: ((last - prev) / (prev || 1)) * 100 };
            }).sort((a, b) => b.growth - a.growth);
            const top = growth[0];
            return top ? (
              <>
                <span className="font-semibold text-sm">{top.nome}</span>
                <span className="text-xs text-green-500 block">+{top.growth.toFixed(0)}% vs mês anterior</span>
              </>
            ) : <span className="text-xs text-muted-foreground">—</span>;
          })()}
        </div>
        <div className="bg-card rounded-lg border border-border p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[10px] uppercase text-muted-foreground">Sem Contato +30d</span>
          </div>
          {noContact.length > 0 ? noContact.map(r => (
            <div key={r.id} className="text-xs text-red-400">{r.nome}</div>
          )) : <span className="text-xs text-muted-foreground">Nenhum 🎉</span>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// DETAIL PANEL
// ═══════════════════════════════════════════════
function DetailPanel({ rev, onUpdate, onClose, onDelete, userName, reload }: {
  rev: Revendedor; onUpdate: (u: Partial<Revendedor>) => void; onClose: () => void; onDelete: () => void; userName: string; reload: () => void;
}) {
  const [tab, setTab] = useState("overview");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 opacity-[0.06]" style={{ background: `linear-gradient(135deg, ${REVENDEDOR_STATUS_COLORS[rev.status]}, transparent 60%)` }} />
        <div className="relative px-5 pt-5 pb-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center text-xl font-bold text-primary-foreground shrink-0">
              {rev.nome.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold truncate">{rev.nome}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: REVENDEDOR_STATUS_COLORS[rev.status] }} />
                  <span className="text-xs" style={{ color: REVENDEDOR_STATUS_COLORS[rev.status] }}>{rev.status}</span>
                </div>
                {rev.cidade && <span className="text-xs text-muted-foreground">· {rev.cidade}</span>}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold font-mono leading-none" style={{ color: scoreColor(rev.score) }}>{rev.score}</div>
              <div className="text-[9px] text-muted-foreground mb-1.5">score</div>
              <div className="w-12 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${rev.score}%`, backgroundColor: scoreColor(rev.score) }} />
              </div>
            </div>
          </div>

          {/* Contact CTAs */}
          <div className="flex gap-2">
            {rev.whatsapp && (
              <Button size="sm" className="h-8 text-xs flex-1 gap-1.5 bg-green-500/10 border border-green-500/25 text-green-500 hover:bg-green-500/20"
                onClick={() => window.open(`https://wa.me/${rev.whatsapp}`, "_blank")}>
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </Button>
            )}
            {rev.instagram && (
              <Button size="sm" className="h-8 text-xs flex-1 gap-1.5 bg-purple-500/10 border border-purple-500/25 text-purple-400 hover:bg-purple-500/20"
                onClick={() => window.open(`https://instagram.com/${rev.instagram.replace("@", "")}`, "_blank")}>
                <Instagram className="w-3.5 h-3.5" /> Instagram
              </Button>
            )}
            {rev.email && (
              <Button size="sm" className="h-8 text-xs gap-1.5 bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20"
                onClick={() => window.open(`mailto:${rev.email}`)}>
                <Mail className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-5 h-9">
          <TabsTrigger value="overview" className="text-xs data-[state=active]:text-gold">Visão Geral</TabsTrigger>
          <TabsTrigger value="historico" className="text-xs data-[state=active]:text-gold">Histórico</TabsTrigger>
          <TabsTrigger value="editar" className="text-xs data-[state=active]:text-gold">Editar</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex-1 overflow-y-auto p-5 space-y-4 m-0">
          <OverviewTab rev={rev} onUpdate={onUpdate} reload={reload} userName={userName} />
        </TabsContent>
        <TabsContent value="historico" className="flex-1 overflow-y-auto p-5 space-y-4 m-0">
          <HistoricoTab rev={rev} onUpdate={onUpdate} reload={reload} userName={userName} />
        </TabsContent>
        <TabsContent value="editar" className="flex-1 overflow-y-auto p-5 space-y-4 m-0">
          <EditarTab rev={rev} onUpdate={onUpdate} onDelete={onDelete} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab({ rev, onUpdate, reload, userName }: { rev: Revendedor; onUpdate: (u: Partial<Revendedor>) => void; reload: () => void; userName: string }) {
  const [newTag, setNewTag] = useState("");

  const addTag = () => {
    if (!newTag.trim()) return;
    onUpdate({ tags: [...(rev.tags || []), newTag.trim()] });
    setNewTag("");
    reload();
  };

  const removeTag = (t: string) => {
    onUpdate({ tags: (rev.tags || []).filter(x => x !== t) });
    reload();
  };

  const completeProximaAcao = () => {
    const hist: Interacao = {
      id: `h${Date.now()}`,
      data: new Date().toISOString().split("T")[0],
      tipo: "Outro",
      descricao: `✅ Ação concluída: ${rev.proximaAcao?.descricao}`,
      autor: userName,
    };
    onUpdate({
      proximaAcao: null,
      historico: [hist, ...(rev.historico || [])],
      ultima: new Date().toISOString().split("T")[0],
    });
    reload();
    toast.success("Ação concluída");
  };

  return (
    <>
      {/* Info grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Responsável", content: <div className="flex items-center gap-1.5"><Avatar name={rev.responsavel} size={18} /><span className="text-sm font-medium">{rev.responsavel}</span></div> },
          { label: "Canal", content: <span className="text-sm font-medium">{rev.canal}</span> },
          { label: "Cidade", content: <span className="text-sm font-medium">{rev.cidade || "—"}</span> },
          { label: "Volume/mês", content: <span className="text-xl font-bold font-mono text-gold">{rev.volume} <span className="text-xs text-muted-foreground font-normal">un</span></span> },
        ].map(item => (
          <div key={item.label} className="bg-secondary/30 rounded-lg p-2.5">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-1">{item.label}</span>
            {item.content}
          </div>
        ))}
      </div>

      {/* Tags */}
      <div>
        <span className="text-[10px] uppercase text-muted-foreground block mb-1.5">Tags</span>
        <div className="flex flex-wrap gap-1">
          {(rev.tags || []).map(t => (
            <Badge key={t} variant="secondary" className="text-[10px] gap-1">
              {t}
              <button onClick={() => removeTag(t)} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
            </Badge>
          ))}
          <div className="flex items-center gap-1">
            <Input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag()} placeholder="+ tag" className="h-6 w-20 text-[10px] bg-secondary/40" />
          </div>
        </div>
      </div>

      {/* Próxima Ação */}
      <div className="bg-secondary/30 rounded-lg border border-border p-3">
        <span className="text-[10px] uppercase text-muted-foreground block mb-1">Próxima Ação</span>
        {rev.proximaAcao ? (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-3 h-3 text-gold" />
              <span className="text-xs font-mono">{rev.proximaAcao.data ? format(parseISO(rev.proximaAcao.data), "dd/MM/yyyy") : "—"}</span>
              {rev.proximaAcao.data && safeDiffDays(rev.proximaAcao.data) > 0 && (
                <Badge variant="destructive" className="text-[8px]">vencida</Badge>
              )}
            </div>
            <p className="text-sm mb-2">{rev.proximaAcao.descricao}</p>
            <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={completeProximaAcao}>
              <Check className="w-3 h-3 mr-1" /> Concluída
            </Button>
          </div>
        ) : <span className="text-xs text-muted-foreground">Nenhuma ação definida</span>}
      </div>

      {/* Volume Chart */}
      {rev.volumeHistorico?.length > 0 && (
        <div>
          <span className="text-[10px] uppercase text-muted-foreground block mb-2">Volume — Últimos 6 Meses</span>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={rev.volumeHistorico}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 18% 14%)" />
              <XAxis dataKey="mes" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
              <Area type="monotone" dataKey="volume" stroke="hsl(var(--gold))" fill="hsl(var(--gold) / 0.15)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Contatos */}
      <div>
        <span className="text-[10px] uppercase text-muted-foreground block mb-1.5">Contatos</span>
        <div className="space-y-1.5 text-sm">
          {rev.whatsapp && (
            <a href={`https://wa.me/${rev.whatsapp}`} target="_blank" rel="noopener" className="flex items-center gap-2 text-green-500 hover:underline">
              <MessageCircle className="w-3.5 h-3.5" /> {rev.whatsapp}
            </a>
          )}
          {rev.instagram && (
            <a href={`https://instagram.com/${rev.instagram.replace("@", "")}`} target="_blank" rel="noopener" className="flex items-center gap-2 text-purple-400 hover:underline">
              <Instagram className="w-3.5 h-3.5" /> {rev.instagram}
            </a>
          )}
          {rev.email && (
            <a href={`mailto:${rev.email}`} className="flex items-center gap-2 text-blue-400 hover:underline">
              <Mail className="w-3.5 h-3.5" /> {rev.email}
            </a>
          )}
          {rev.telefone && (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-3.5 h-3.5" /> {rev.telefone}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

function HistoricoTab({ rev, onUpdate, reload, userName }: { rev: Revendedor; onUpdate: (u: Partial<Revendedor>) => void; reload: () => void; userName: string }) {
  const [showForm, setShowForm] = useState(false);
  const [tipo, setTipo] = useState<InteracaoTipo>("WhatsApp");
  const [desc, setDesc] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);

  const addInteracao = () => {
    if (!desc.trim()) return;
    const newInt: Interacao = {
      id: `h${Date.now()}`,
      data,
      tipo,
      descricao: desc,
      autor: userName,
    };
    onUpdate({
      historico: [newInt, ...(rev.historico || [])],
      ultima: data,
    });
    setDesc("");
    setShowForm(false);
    reload();
    toast.success("Interação registrada");
  };

  const historico = [...(rev.historico || [])].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <>
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold">Histórico de Interações</span>
        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3 h-3 mr-1" /> Registrar
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-secondary/30 rounded-lg border border-border p-3 space-y-2"
          >
            <div className="grid grid-cols-2 gap-2">
              <Select value={tipo} onValueChange={v => setTipo(v as InteracaoTipo)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{INTERACAO_TIPOS.map(t => <SelectItem key={t} value={t}>{INTERACAO_ICONS[t]} {t}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="date" value={data} onChange={e => setData(e.target.value)} className="h-8 text-xs" />
            </div>
            <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição da interação..." className="min-h-[60px] text-sm bg-secondary/40" />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button size="sm" className="h-7 text-xs gradient-gold text-primary-foreground" disabled={!desc.trim()} onClick={addInteracao}>Salvar</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline */}
      <div className="space-y-0">
        {historico.map((h, i) => (
          <div key={h.id} className="flex gap-3 pb-4 relative">
            {i < historico.length - 1 && <div className="absolute left-[11px] top-6 w-px h-[calc(100%-12px)] bg-border" />}
            <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center text-[11px] shrink-0 z-10">
              {INTERACAO_ICONS[h.tipo] || "📌"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-mono text-muted-foreground">{h.data ? format(parseISO(h.data), "dd/MM/yyyy") : "—"}</span>
                <Badge variant="secondary" className="text-[9px]">{h.autor}</Badge>
              </div>
              <p className="text-sm text-foreground">{h.descricao}</p>
            </div>
          </div>
        ))}
        {historico.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma interação registrada</p>
        )}
      </div>
    </>
  );
}

function EditarTab({ rev, onUpdate, onDelete }: { rev: Revendedor; onUpdate: (u: Partial<Revendedor>) => void; onDelete: () => void }) {
  const [nome, setNome] = useState(rev.nome);
  const [responsavel, setResponsavel] = useState(rev.responsavel);
  const [status, setStatus] = useState(rev.status);
  const [cidade, setCidade] = useState(rev.cidade);
  const [whatsapp, setWhatsapp] = useState(rev.whatsapp || "");
  const [instagram, setInstagram] = useState(rev.instagram || "");
  const [email, setEmail] = useState(rev.email || "");
  const [telefone, setTelefone] = useState(rev.telefone || "");
  const [canal, setCanal] = useState(rev.canal);
  const [volume, setVolume] = useState(rev.volume);
  const [obs, setObs] = useState(rev.obs || "");
  const [proxData, setProxData] = useState(rev.proximaAcao?.data || "");
  const [proxDesc, setProxDesc] = useState(rev.proximaAcao?.descricao || "");
  const [tagsStr, setTagsStr] = useState((rev.tags || []).join(", "));

  useEffect(() => {
    setNome(rev.nome); setResponsavel(rev.responsavel); setStatus(rev.status); setCidade(rev.cidade);
    setWhatsapp(rev.whatsapp || ""); setInstagram(rev.instagram || ""); setEmail(rev.email || ""); setTelefone(rev.telefone || "");
    setCanal(rev.canal); setVolume(rev.volume); setObs(rev.obs || "");
    setProxData(rev.proximaAcao?.data || ""); setProxDesc(rev.proximaAcao?.descricao || "");
    setTagsStr((rev.tags || []).join(", "));
  }, [rev]);

  const save = () => {
    onUpdate({
      nome, responsavel, status, cidade,
      whatsapp, instagram, email, telefone,
      canal, volume, obs,
      tags: tagsStr.split(",").map(t => t.trim()).filter(Boolean),
      proximaAcao: proxData && proxDesc ? { data: proxData, descricao: proxDesc } : null,
    });
    toast.success("Salvo");
  };

  return (
    <>
      {/* Info */}
      <div>
        <span className="text-[10px] uppercase text-muted-foreground block mb-2 font-semibold">Informações</span>
        <div className="space-y-2">
          <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome" className="bg-secondary/40" />
          <div className="grid grid-cols-2 gap-2">
            <Select value={responsavel} onValueChange={setResponsavel}>
              <SelectTrigger className="bg-secondary/40"><SelectValue /></SelectTrigger>
              <SelectContent>{TEAM_MEMBERS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={status} onValueChange={v => setStatus(v as RevendedorStatus)}>
              <SelectTrigger className="bg-secondary/40"><SelectValue /></SelectTrigger>
              <SelectContent>{ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Cidade" className="bg-secondary/40" />
        </div>
      </div>

      {/* Contato */}
      <div>
        <span className="text-[10px] uppercase text-muted-foreground block mb-2 font-semibold">Contato</span>
        <div className="grid grid-cols-2 gap-2">
          <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="WhatsApp" className="bg-secondary/40" />
          <Input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="Instagram" className="bg-secondary/40" />
          <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="bg-secondary/40" />
          <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="Telefone" className="bg-secondary/40" />
        </div>
      </div>

      {/* Comercial */}
      <div>
        <span className="text-[10px] uppercase text-muted-foreground block mb-2 font-semibold">Comercial</span>
        <div className="grid grid-cols-2 gap-2">
          <Select value={canal} onValueChange={v => setCanal(v as RevendedorCanal)}>
            <SelectTrigger className="bg-secondary/40"><SelectValue /></SelectTrigger>
            <SelectContent>{CANAIS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="number" value={volume} onChange={e => setVolume(Number(e.target.value))} placeholder="Volume mensal" className="bg-secondary/40" />
        </div>
        <Input value={tagsStr} onChange={e => setTagsStr(e.target.value)} placeholder="Tags (separadas por vírgula)" className="bg-secondary/40 mt-2" />
      </div>

      {/* Próxima ação */}
      <div>
        <span className="text-[10px] uppercase text-muted-foreground block mb-2 font-semibold">Próxima Ação</span>
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={proxData} onChange={e => setProxData(e.target.value)} className="bg-secondary/40" />
          <Input value={proxDesc} onChange={e => setProxDesc(e.target.value)} placeholder="Descrição" className="bg-secondary/40" />
        </div>
      </div>

      {/* Obs */}
      <div>
        <span className="text-[10px] uppercase text-muted-foreground block mb-2 font-semibold">Observações</span>
        <Textarea value={obs} onChange={e => setObs(e.target.value)} className="bg-secondary/40 min-h-[60px]" />
      </div>

      <div className="flex gap-2 justify-between pt-2 border-t border-border">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="h-8 text-xs"><Trash2 className="w-3 h-3 mr-1" /> Excluir</Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader><AlertDialogTitle>Excluir revendedor?</AlertDialogTitle></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button className="gradient-gold text-primary-foreground font-semibold h-8 text-xs" onClick={save}>Salvar Alterações</Button>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════
// NEW REVENDEDOR DIALOG (3 STEPS)
// ═══════════════════════════════════════════════
function NewRevendedorDialog({ open, onOpenChange, preStatus, onSave }: {
  open: boolean; onOpenChange: (b: boolean) => void; preStatus?: RevendedorStatus; onSave: (data: Omit<Revendedor, "id">) => void;
}) {
  const [step, setStep] = useState(1);
  const [nome, setNome] = useState("");
  const [responsavel, setResponsavel] = useState("Luca");
  const [status, setStatus] = useState<RevendedorStatus>(preStatus || "Novo Lead");
  const [cidade, setCidade] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [canal, setCanal] = useState<RevendedorCanal>("WhatsApp");
  const [volume, setVolume] = useState(0);
  const [tagsStr, setTagsStr] = useState("");
  const [proxData, setProxData] = useState("");
  const [proxDesc, setProxDesc] = useState("");
  const [obs, setObs] = useState("");

  useEffect(() => {
    if (open) {
      setStep(1); setNome(""); setResponsavel("Luca"); setStatus(preStatus || "Novo Lead"); setCidade("");
      setWhatsapp(""); setInstagram(""); setEmail(""); setTelefone("");
      setCanal("WhatsApp"); setVolume(0); setTagsStr(""); setProxData(""); setProxDesc(""); setObs("");
    }
  }, [open, preStatus]);

  const save = () => {
    const tags = tagsStr.split(",").map(t => t.trim()).filter(Boolean);
    const prox = proxData && proxDesc ? { data: proxData, descricao: proxDesc } : null;
    onSave({
      nome, responsavel, status, canal, cidade, volume, obs,
      ultima: new Date().toISOString().split("T")[0],
      whatsapp, instagram, email, telefone,
      tags, score: 0,
      proximaAcao: prox,
      volumeHistorico: [{ mes: new Date().toISOString().slice(0, 7), volume }],
      historico: [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-gold">Novo Revendedor — Passo {step}/3</DialogTitle>
        </DialogHeader>
        {/* Progress */}
        <div className="flex gap-1 mb-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? "bg-gold" : "bg-secondary"}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">Nome *</label>
              <Input value={nome} onChange={e => setNome(e.target.value)} className="bg-secondary/40" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground mb-1 block">Responsável *</label>
                <Select value={responsavel} onValueChange={setResponsavel}>
                  <SelectTrigger className="bg-secondary/40"><SelectValue /></SelectTrigger>
                  <SelectContent>{TEAM_MEMBERS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <Select value={status} onValueChange={v => setStatus(v as RevendedorStatus)}>
                  <SelectTrigger className="bg-secondary/40"><SelectValue /></SelectTrigger>
                  <SelectContent>{ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Cidade</label>
              <Input value={cidade} onChange={e => setCidade(e.target.value)} className="bg-secondary/40" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground mb-1 block">WhatsApp</label>
                <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="5511999..." className="bg-secondary/40" />
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Instagram</label>
                <Input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@perfil" className="bg-secondary/40" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground mb-1 block">Email</label>
                <Input value={email} onChange={e => setEmail(e.target.value)} className="bg-secondary/40" />
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Telefone</label>
                <Input value={telefone} onChange={e => setTelefone(e.target.value)} className="bg-secondary/40" />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground mb-1 block">Canal</label>
                <Select value={canal} onValueChange={v => setCanal(v as RevendedorCanal)}>
                  <SelectTrigger className="bg-secondary/40"><SelectValue /></SelectTrigger>
                  <SelectContent>{CANAIS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Volume Mensal</label>
                <Input type="number" value={volume} onChange={e => setVolume(Number(e.target.value))} className="bg-secondary/40" />
              </div>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Tags (separadas por vírgula)</label>
              <Input value={tagsStr} onChange={e => setTagsStr(e.target.value)} className="bg-secondary/40" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground mb-1 block">Próxima Ação — Data</label>
                <Input type="date" value={proxData} onChange={e => setProxData(e.target.value)} className="bg-secondary/40" />
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
                <Input value={proxDesc} onChange={e => setProxDesc(e.target.value)} className="bg-secondary/40" />
              </div>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Observações</label>
              <Textarea value={obs} onChange={e => setObs(e.target.value)} className="bg-secondary/40" />
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-between pt-2">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="text-xs"><ChevronLeft className="w-3 h-3 mr-1" /> Anterior</Button>
          ) : <div />}
          {step < 3 ? (
            <Button variant="outline" onClick={() => setStep(s => s + 1)} disabled={step === 1 && !nome.trim()} className="text-xs">
              Próximo <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          ) : (
            <Button className="gradient-gold text-primary-foreground font-semibold text-xs" disabled={!nome.trim()} onClick={save}>Salvar</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RevendedoresPage;
