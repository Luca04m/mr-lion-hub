import { useState, useEffect } from "react";
import { Campaign, Phase, Angle, CampaignStatus, CAMPAIGN_STATUS_LABELS, CAMPAIGN_CHANNELS } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Tag, Radio, CalendarDays, Layers, Megaphone, StickyNote } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  campaign?: Campaign;
  onSave: (data: Omit<Campaign, "id" | "createdAt" | "updatedAt">) => void;
}

const emptyPhase = (): Phase => ({ name: "", dateStart: "", dateEnd: "", description: "" });
const emptyAngle = (): Omit<Angle, "id"> => ({ title: "", concept: "", trigger: "", audience: "", bestChannel: "", risk: "Baixo" });

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-gold/60">{icon}</span>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export function CampaignFormDialog({ open, onOpenChange, campaign, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [concept, setConcept] = useState("");
  const [tagline, setTagline] = useState("");
  const [product, setProduct] = useState("");
  const [status, setStatus] = useState<CampaignStatus>("rascunho");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [phases, setPhases] = useState<Phase[]>([emptyPhase()]);
  const [angles, setAngles] = useState<Omit<Angle, "id">[]>([emptyAngle()]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (campaign) {
      setTitle(campaign.title); setConcept(campaign.concept); setTagline(campaign.tagline);
      setProduct(campaign.product); setStatus(campaign.status); setStartDate(campaign.startDate);
      setEndDate(campaign.endDate); setChannels(campaign.channels);
      setPhases(campaign.phases.length > 0 ? campaign.phases : [emptyPhase()]);
      setAngles(campaign.angles.length > 0 ? campaign.angles.map(({ id: _, ...r }) => r) : [emptyAngle()]);
      setNotes(campaign.notes);
    } else {
      setTitle(""); setConcept(""); setTagline(""); setProduct(""); setStatus("rascunho");
      setStartDate(""); setEndDate(""); setChannels([]);
      setPhases([emptyPhase()]); setAngles([emptyAngle()]); setNotes("");
    }
  }, [open, campaign]);

  const toggleChannel = (ch: string) =>
    setChannels(p => p.includes(ch) ? p.filter(c => c !== ch) : [...p, ch]);

  const updPhase = (i: number, k: keyof Phase, v: string) =>
    setPhases(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const addPhase = () => setPhases(p => [...p, emptyPhase()]);
  const rmPhase = (i: number) => setPhases(p => p.filter((_, j) => j !== i));

  const updAngle = (i: number, k: keyof Omit<Angle, "id">, v: string) =>
    setAngles(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const addAngle = () => setAngles(p => [...p, emptyAngle()]);
  const rmAngle = (i: number) => setAngles(p => p.filter((_, j) => j !== i));

  const handleSave = () => {
    if (!title.trim() || !concept.trim()) return;
    onSave({
      title, concept, tagline, product, status, startDate, endDate, channels,
      phases: phases.filter(p => p.name.trim()),
      angles: angles.filter(a => a.title.trim()).map((a, i) => ({ ...a, id: i + 1 })),
      notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-3xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-foreground text-lg">
            {campaign ? "Editar campanha" : "Nova campanha"}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-7">

          {/* ── IDENTIDADE ── */}
          <div>
            <SectionHeader icon={<Tag className="w-3.5 h-3.5" />} label="Identidade" />
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Título *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)}
                  className="bg-secondary/40 border-border mt-1" placeholder="Ex: Dia do Consumidor — Mr. Lion Honey" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Conceito *</Label>
                <Input value={concept} onChange={e => setConcept(e.target.value)}
                  className="bg-secondary/40 border-border mt-1" placeholder="Ex: Recompensa Real" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tagline</Label>
                <Input value={tagline} onChange={e => setTagline(e.target.value)}
                  className="bg-secondary/40 border-border mt-1 text-sm" placeholder="O Paladar da Realeza..." />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Produto</Label>
                <Input value={product} onChange={e => setProduct(e.target.value)}
                  className="bg-secondary/40 border-border mt-1" placeholder="Mr. Lion Honey" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={status} onValueChange={v => setStatus(v as CampaignStatus)}>
                  <SelectTrigger className="bg-secondary/40 border-border mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["rascunho", "ativa", "pausada", "encerrada"] as CampaignStatus[]).map(s => (
                      <SelectItem key={s} value={s}>{CAMPAIGN_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── PERÍODO & CANAIS ── */}
          <div>
            <SectionHeader icon={<CalendarDays className="w-3.5 h-3.5" />} label="Período & Canais" />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="text-xs text-muted-foreground">Início</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="bg-secondary/40 border-border mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fim</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="bg-secondary/40 border-border mt-1" />
              </div>
            </div>
            <Label className="text-xs text-muted-foreground">Canais</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {CAMPAIGN_CHANNELS.map(ch => (
                <button key={ch} type="button" onClick={() => toggleChannel(ch)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all font-medium ${
                    channels.includes(ch)
                      ? "bg-gold/15 border-gold/50 text-gold shadow-[0_0_0_1px_rgba(212,175,55,0.2)]"
                      : "bg-secondary/30 border-border text-muted-foreground hover:border-gold/30 hover:text-foreground"
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          {/* ── FASES ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-gold/60"><Layers className="w-3.5 h-3.5" /></span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fases</span>
              <div className="flex-1 h-px bg-border" />
              <Button type="button" onClick={addPhase} size="sm" variant="outline" className="h-6 text-[11px] gap-1 px-2.5">
                <Plus className="w-3 h-3" /> Fase
              </Button>
            </div>

            <div className="space-y-2">
              {phases.map((ph, i) => (
                <div key={i} className="bg-secondary/20 border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-medium text-gold/60 bg-gold/10 px-1.5 py-0.5 rounded">
                      FASE {i + 1}
                    </span>
                    {phases.length > 1 && (
                      <button type="button" onClick={() => rmPhase(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Nome *</Label>
                      <Input value={ph.name} onChange={e => updPhase(i, "name", e.target.value)}
                        className="bg-secondary/40 border-border h-7 text-xs mt-0.5" placeholder="Aquecimento" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Início</Label>
                      <Input type="date" value={ph.dateStart} onChange={e => updPhase(i, "dateStart", e.target.value)}
                        className="bg-secondary/40 border-border h-7 text-xs mt-0.5" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Fim</Label>
                      <Input type="date" value={ph.dateEnd} onChange={e => updPhase(i, "dateEnd", e.target.value)}
                        className="bg-secondary/40 border-border h-7 text-xs mt-0.5" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Descrição / Objetivo</Label>
                    <Input value={ph.description} onChange={e => updPhase(i, "description", e.target.value)}
                      className="bg-secondary/40 border-border h-7 text-xs mt-0.5" placeholder="O que esta fase quer alcançar" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── ÂNGULOS ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-gold/60"><Megaphone className="w-3.5 h-3.5" /></span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ângulos</span>
              <div className="flex-1 h-px bg-border" />
              <Button type="button" onClick={addAngle} size="sm" variant="outline" className="h-6 text-[11px] gap-1 px-2.5">
                <Plus className="w-3 h-3" /> Ângulo
              </Button>
            </div>

            <div className="space-y-2">
              {angles.map((an, i) => (
                <div key={i} className="bg-secondary/20 border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-medium text-gold/60 bg-gold/10 px-1.5 py-0.5 rounded">
                      ÂNGULO {i + 1}
                    </span>
                    {angles.length > 1 && (
                      <button type="button" onClick={() => rmAngle(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Título *</Label>
                      <Input value={an.title} onChange={e => updAngle(i, "title", e.target.value)}
                        className="bg-secondary/40 border-border h-7 text-xs mt-0.5" placeholder="Sua Recompensa Anual" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Gatilho</Label>
                      <Input value={an.trigger} onChange={e => updAngle(i, "trigger", e.target.value)}
                        className="bg-secondary/40 border-border h-7 text-xs mt-0.5" placeholder="Recompensa, Exclusividade" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[10px] text-muted-foreground">Conceito / Mensagem central</Label>
                      <Textarea value={an.concept} onChange={e => updAngle(i, "concept", e.target.value)}
                        className="bg-secondary/40 border-border text-xs min-h-[52px] mt-0.5 resize-none"
                        placeholder="No Dia do Consumidor, você não ganha um desconto..." />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Público-alvo</Label>
                      <Input value={an.audience} onChange={e => updAngle(i, "audience", e.target.value)}
                        className="bg-secondary/40 border-border h-7 text-xs mt-0.5" placeholder="Consumidores que buscam..." />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Melhor canal</Label>
                      <Input value={an.bestChannel} onChange={e => updAngle(i, "bestChannel", e.target.value)}
                        className="bg-secondary/40 border-border h-7 text-xs mt-0.5" placeholder="Instagram, Email" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Nível de risco</Label>
                      <Select value={an.risk} onValueChange={v => updAngle(i, "risk", v)}>
                        <SelectTrigger className="bg-secondary/40 border-border h-7 text-xs mt-0.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Baixo">🟢 Baixo</SelectItem>
                          <SelectItem value="Médio">🟡 Médio</SelectItem>
                          <SelectItem value="Alto">🔴 Alto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── NOTAS ── */}
          <div>
            <SectionHeader icon={<StickyNote className="w-3.5 h-3.5" />} label="Notas" />
            <Textarea value={notes} onChange={e => setNotes(e.target.value)}
              className="bg-secondary/40 border-border min-h-[80px]"
              placeholder="Instruções, observações, diretrizes de comunicação, restrições..." />
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="px-6 py-4 border-t border-border flex gap-2 bg-card sticky bottom-0">
          <Button type="button" onClick={() => onOpenChange(false)} variant="outline" className="text-xs">
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={!title.trim() || !concept.trim()}
            className="flex-1 text-xs gradient-gold text-primary-foreground font-semibold">
            {campaign ? "Salvar alterações" : "Criar campanha"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
