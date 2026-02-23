import { useState, useEffect, useCallback } from "react";
import { getRevendedores, createRevendedor, updateRevendedor, deleteRevendedor, logActivity, getUser } from "@/lib/store";
import { Revendedor, RevendedorStatus, REVENDEDOR_STATUS_COLORS, TEAM_MEMBERS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Pencil, Trash2, Building2, Search, Users, TrendingUp, Package } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const CANAIS = ["WhatsApp", "Instagram", "Indicação", "Outros"];
const STATUSES: RevendedorStatus[] = ["Ativo", "Inativo", "Novo Lead", "Em Negociação"];

const RevendedoresPage = () => {
  const [revs, setRevs] = useState<Revendedor[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Revendedor | undefined>();
  const [selected, setSelected] = useState<Revendedor | null>(null);
  const userName = getUser() || "";

  const reload = useCallback(() => setRevs(getRevendedores()), []);
  useEffect(() => { reload(); }, [reload]);

  const filtered = revs.filter(r => !search || r.nome.toLowerCase().includes(search.toLowerCase()) || r.cidade.toLowerCase().includes(search.toLowerCase()));

  const byStatus = (s: RevendedorStatus) => revs.filter(r => r.status === s).length;
  const totalVolume = revs.reduce((sum, r) => sum + r.volume, 0);
  const avgVolume = revs.length > 0 ? Math.round(totalVolume / revs.length) : 0;
  const newThisMonth = revs.filter(r => r.status === "Novo Lead").length;

  const handleSave = (data: Omit<Revendedor, "id">) => {
    if (editing) {
      updateRevendedor(editing.id, data);
      toast.success("Revendedor atualizado");
    } else {
      createRevendedor(data);
      logActivity({ taskId: 0, taskTitle: data.nome, userName, action: "revendedor_created", oldValue: null, newValue: data.nome });
      toast.success("Revendedor cadastrado");
    }
    setEditing(undefined);
    setDialogOpen(false);
    reload();
  };

  const handleDelete = (id: string) => {
    const rev = revs.find(r => r.id === id);
    deleteRevendedor(id);
    if (rev) logActivity({ taskId: 0, taskTitle: rev.nome, userName, action: "revendedor_deleted", oldValue: rev.nome, newValue: null });
    toast.success("Revendedor removido");
    setSelected(null);
    reload();
  };

  const stats = [
    { label: "Total", value: revs.length, icon: Building2, color: "hsl(var(--gold))" },
    { label: "Ativos", value: byStatus("Ativo"), icon: Users, color: "#22C55E" },
    { label: "Novos (mês)", value: newThisMonth, icon: TrendingUp, color: "#3B82F6" },
    { label: "Vol. médio/mês", value: `${avgVolume}`, icon: Package, color: "#F59E0B" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Revendedores</h1>
        <Button onClick={() => { setEditing(undefined); setDialogOpen(true); }} className="gradient-gold text-primary-foreground font-semibold glow-pulse" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Novo Revendedor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-card rounded-lg border border-border p-3 hover:-translate-y-0.5 hover:border-gold/30 transition-all" style={{ borderLeftWidth: 3, borderLeftColor: s.color }}>
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</span>
            </div>
            <span className="text-xl font-bold font-mono" style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou cidade..." className="pl-8 h-8 text-sm bg-secondary/40" />
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase text-muted-foreground tracking-wider">
              <th className="text-left px-3 py-2.5">Nome</th>
              <th className="text-left px-3 py-2.5 hidden sm:table-cell">Responsável</th>
              <th className="text-left px-3 py-2.5">Status</th>
              <th className="text-left px-3 py-2.5 hidden md:table-cell">Canal</th>
              <th className="text-left px-3 py-2.5 hidden md:table-cell">Cidade</th>
              <th className="text-right px-3 py-2.5">Vol./mês</th>
              <th className="text-right px-3 py-2.5 hidden lg:table-cell">Última atividade</th>
              <th className="text-right px-3 py-2.5">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/20 cursor-pointer transition-colors" onClick={() => setSelected(r)}>
                <td className="px-3 py-2.5 font-medium">{r.nome}</td>
                <td className="px-3 py-2.5 hidden sm:table-cell">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-secondary border border-border flex items-center justify-center text-[9px] font-bold text-gold">{r.responsavel.charAt(0)}</div>
                    <span className="text-muted-foreground text-xs">{r.responsavel}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <Badge variant="outline" className="text-[10px]" style={{ borderColor: `${REVENDEDOR_STATUS_COLORS[r.status]}40`, color: REVENDEDOR_STATUS_COLORS[r.status] }}>
                    {r.status}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground text-xs hidden md:table-cell">{r.canal}</td>
                <td className="px-3 py-2.5 text-muted-foreground text-xs hidden md:table-cell">{r.cidade}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs">{r.volume}</td>
                <td className="px-3 py-2.5 text-right text-[10px] font-mono text-muted-foreground hidden lg:table-cell">
                  {formatDistanceToNow(new Date(r.ultima), { locale: ptBR, addSuffix: true })}
                </td>
                <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Tooltip><TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditing(r); setDialogOpen(true); }}>
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Trash2 className="w-3 h-3 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader><AlertDialogTitle>Excluir revendedor?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(r.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum revendedor encontrado</p>
          </div>
        )}
      </div>

      <RevendedorDialog open={dialogOpen} onOpenChange={setDialogOpen} revendedor={editing} onSave={handleSave} />

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={b => { if (!b) setSelected(null); }}>
        <SheetContent className="w-full sm:w-[80%] sm:max-w-lg bg-card border-border overflow-y-auto p-0">
          {selected && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
                <SheetTitle className="text-foreground">{selected.nome}</SheetTitle>
              </SheetHeader>
              <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-[10px] uppercase text-muted-foreground block">Responsável</span>{selected.responsavel}</div>
                  <div><span className="text-[10px] uppercase text-muted-foreground block">Status</span>
                    <Badge variant="outline" style={{ borderColor: `${REVENDEDOR_STATUS_COLORS[selected.status]}40`, color: REVENDEDOR_STATUS_COLORS[selected.status] }}>{selected.status}</Badge>
                  </div>
                  <div><span className="text-[10px] uppercase text-muted-foreground block">Canal</span>{selected.canal}</div>
                  <div><span className="text-[10px] uppercase text-muted-foreground block">Cidade</span>{selected.cidade}</div>
                  <div><span className="text-[10px] uppercase text-muted-foreground block">Volume/mês</span><span className="font-mono text-gold">{selected.volume}</span></div>
                  <div><span className="text-[10px] uppercase text-muted-foreground block">Última atividade</span><span className="font-mono">{format(new Date(selected.ultima), "dd/MM/yyyy")}</span></div>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground block mb-1">Observações</span>
                  <Textarea defaultValue={selected.obs} onBlur={e => { updateRevendedor(selected.id, { obs: e.target.value }); reload(); toast.success("Salvo", { duration: 1500 }); }} className="bg-secondary/40 min-h-[80px] text-sm" placeholder="Anotações sobre este revendedor..." />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

function RevendedorDialog({ open, onOpenChange, revendedor, onSave }: {
  open: boolean; onOpenChange: (b: boolean) => void; revendedor?: Revendedor; onSave: (data: Omit<Revendedor, "id">) => void;
}) {
  const [nome, setNome] = useState("");
  const [responsavel, setResponsavel] = useState("Luca");
  const [status, setStatus] = useState<RevendedorStatus>("Novo Lead");
  const [canal, setCanal] = useState("WhatsApp");
  const [cidade, setCidade] = useState("");
  const [volume, setVolume] = useState(0);
  const [obs, setObs] = useState("");

  useEffect(() => {
    if (revendedor) {
      setNome(revendedor.nome); setResponsavel(revendedor.responsavel); setStatus(revendedor.status);
      setCanal(revendedor.canal); setCidade(revendedor.cidade); setVolume(revendedor.volume); setObs(revendedor.obs);
    } else {
      setNome(""); setResponsavel("Luca"); setStatus("Novo Lead"); setCanal("WhatsApp"); setCidade(""); setVolume(0); setObs("");
    }
  }, [revendedor, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader><DialogTitle className="text-gold">{revendedor ? "Editar" : "Novo"} Revendedor</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} className="bg-secondary/40" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Responsável</label>
              <Select value={responsavel} onValueChange={setResponsavel}>
                <SelectTrigger className="bg-secondary/40"><SelectValue /></SelectTrigger>
                <SelectContent>{TEAM_MEMBERS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <Select value={status} onValueChange={v => setStatus(v as RevendedorStatus)}>
                <SelectTrigger className="bg-secondary/40"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Canal</label>
              <Select value={canal} onValueChange={setCanal}>
                <SelectTrigger className="bg-secondary/40"><SelectValue /></SelectTrigger>
                <SelectContent>{CANAIS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input placeholder="Cidade" value={cidade} onChange={e => setCidade(e.target.value)} className="bg-secondary/40" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Volume mensal estimado</label>
            <Input type="number" value={volume} onChange={e => setVolume(Number(e.target.value))} className="bg-secondary/40" />
          </div>
          <Textarea placeholder="Observações" value={obs} onChange={e => setObs(e.target.value)} className="bg-secondary/40" />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button disabled={!nome.trim()} onClick={() => onSave({ nome, responsavel, status, canal, cidade, volume, obs, ultima: new Date().toISOString().split("T")[0] })} className="gradient-gold text-primary-foreground font-semibold">Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RevendedoresPage;
