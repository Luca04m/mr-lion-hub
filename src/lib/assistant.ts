// Assistente Mr. Lion — contexto/insights derivados dos dados internos do Hub
// (decisão Luca 2026-06-18: v1 usa só dados do app) + cliente do endpoint Workers AI.
import { getTasks, getRevendedores, getPosts, getMeetings, getCampaigns } from "./store";

export interface ChatMsg { role: "user" | "assistant"; content: string; }

export type InsightTone = "gold" | "success" | "danger" | "neutral";
export interface AssistantInsight { label: string; value: string; hint?: string; tone: InsightTone; }

const today = () => new Date().toISOString().slice(0, 10);

export function buildInsights(): AssistantInsight[] {
  const tasks = getTasks();
  const late = tasks.filter(t => t.status === "atrasada").length;
  const done = tasks.filter(t => t.status === "concluida").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const revs = getRevendedores();
  const novos = revs.filter(r => r.status === "Novo Lead").length;
  const negoc = revs.filter(r => r.status === "Em Negociação").length;
  const ativos = revs.filter(r => r.status === "Ativo" || r.status === "Recorrente").length;

  const td = today();
  const postsFuturos = getPosts().filter(p => p.scheduledDate >= td).length;
  const reunioesHoje = getMeetings().filter(m => m.meetingDate === td).length;

  return [
    { label: "Tarefas atrasadas", value: String(late), tone: late > 0 ? "danger" : "success", hint: `${pct}% concluídas` },
    { label: "Novos leads (CRM)", value: String(novos), tone: "gold", hint: `${negoc} em negociação` },
    { label: "Revendedores ativos", value: String(ativos), tone: "success", hint: `${revs.length} no total` },
    { label: "Posts agendados", value: String(postsFuturos), tone: "neutral", hint: reunioesHoje ? `${reunioesHoje} reunião(ões) hoje` : "sem reunião hoje" },
  ];
}

export function buildContext(): string {
  const tasks = getTasks();
  const late = tasks.filter(t => t.status === "atrasada");
  const done = tasks.filter(t => t.status === "concluida").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const revs = getRevendedores();
  const cnt = (s: string) => revs.filter(r => r.status === s).length;

  const td = today();
  const posts = getPosts();
  const meetings = getMeetings();
  const campaigns = getCampaigns();

  return [
    `Tarefas: ${tasks.length} no total — ${late.length} atrasadas, ${done} concluídas (${pct}%).`,
    late.length ? `Tarefas atrasadas: ${late.slice(0, 6).map(t => t.title).join("; ")}.` : "",
    `CRM revendedores: ${revs.length} contatos — ${cnt("Novo Lead")} novos leads, ${cnt("Em Negociação")} em negociação, ${cnt("Ativo")} ativos, ${cnt("Recorrente")} recorrentes, ${cnt("Inativo")} inativos.`,
    `Conteúdo: ${posts.length} posts no calendário (${posts.filter(p => p.scheduledDate >= td).length} agendados pra frente).`,
    `Reuniões hoje: ${meetings.filter(m => m.meetingDate === td).length}.`,
    `Campanhas ativas no painel: ${campaigns.length}.`,
  ].filter(Boolean).join("\n");
}

export async function askAssistant(history: ChatMsg[]): Promise<string> {
  try {
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: history.map(m => ({ role: m.role, content: m.content })),
        context: buildContext(),
      }),
    });
    const data = await res.json().catch(() => ({} as { reply?: string }));
    return data.reply || "Não consegui responder agora.";
  } catch {
    return "Assistente offline — a IA roda no Cloudflare (não responde em localhost sem o binding AI).";
  }
}
