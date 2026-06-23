// Assistente Mr. Lion — contexto/insights derivados dos dados internos do Hub
// (decisão Luca 2026-06-18: v1 usa só dados do app) + cliente do endpoint Workers AI.
import { getTasks, getRevendedores, getPosts, getMeetings, getCampaigns } from "./store";
import { useEstoque } from "../estoque/store";
import { ITENS, RECEITA_BY_PRODUTO } from "../estoque/mock";
import { custoReceita, resumoEstoque, statusEstoque, previsaoReposicao } from "../estoque/engine";
import type { Item } from "../estoque/types";
import { useFinanceiroStore } from "../financeiro/data/store";
import { SNAPSHOTS } from "../financeiro/data/finance";
import type { DREKind } from "../financeiro/data/types";

export interface ChatMsg { role: "user" | "assistant"; content: string; }

export type InsightTone = "gold" | "success" | "danger" | "neutral";
export interface AssistantInsight { label: string; value: string; hint?: string; tone: InsightTone; }

const today = () => new Date().toISOString().slice(0, 10);

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ── Bloco ESTOQUE: saldos vivos do store (fallback mock) + CMV/garrafa por receita ──
function estoqueLines(): string[] {
  let itens: Item[];
  try { itens = useEstoque.getState().itens; } catch { itens = ITENS; }
  if (!itens || !itens.length) itens = ITENS;

  const resumo = resumoEstoque(itens);
  const repor = previsaoReposicao(itens).filter(p => p.urgencia === "atrasado" || p.urgencia === "agora");

  // CMV/garrafa por produto acabado, via receita de envase/completa.
  const pas = itens.filter(i => i.tipo === "produto_acabado");
  const paTxt = pas.map(pa => {
    const rec = RECEITA_BY_PRODUTO(pa.id);
    const cmv = rec ? custoReceita(rec, itens).total : pa.custoMedio;
    const nome = pa.nome.replace(/ \d+ml$/, "").replace(/^Mr\. Lion /, "");
    const inc = rec?.incompleta ? " (receita líquida incompleta)" : "";
    return `${nome} ${pa.estoque} un — CMV R$${cmv.toFixed(2)}/garrafa${inc}`;
  });

  return [
    `Estoque: ${resumo.itensTotais} itens ativos, valor total ${brl(resumo.valorTotal)}; ${resumo.critico} críticos, ${resumo.repor} a repor.`,
    paTxt.length ? `Produtos acabados (estoque + CMV/garrafa): ${paTxt.join("; ")}.` : "",
    repor.length ? `Insumos a comprar já: ${repor.slice(0, 8).map(p => `${p.item.nome} (${statusEstoque(p.item)})`).join("; ")}.` : "",
  ].filter(Boolean);
}

// ── Bloco FINANCEIRO: DRE + produtos + contas do período corrente (store editável) ──
const DESPESA_KINDS: DREKind[] = ["ded", "tax", "fixed"];
function financeiroLines(): string[] {
  try {
    const st = useFinanceiroStore.getState();
    const periodo = st.periodo;
    const periodData = st.data[periodo];
    if (!periodData) return [];
    const dre = periodData.dre;
    const products = periodData.products;
    const contas = periodData.contas ?? SNAPSHOTS[periodo]?.contas ?? [];
    const periodoLabel = SNAPSHOTS[periodo]?.meta.periodoLabel ?? periodo;

    // Replica recomputeDre de telas/Caixa.tsx: lucro bruto = receita − CMV; resultado = receita + Σ despesas (já negativas).
    const receita = dre.find(l => l.kind === "rev")?.value ?? 0;
    const cmvLine = dre.find(l => l.label.toLowerCase().includes("cmv"));
    const cmv = cmvLine ? Math.abs(cmvLine.value) : 0;
    const lucroBruto = receita - cmv;
    const margemPct = receita ? (lucroBruto / receita) * 100 : 0;
    const resultado = receita + dre.filter(l => DESPESA_KINDS.includes(l.kind)).reduce((a, l) => a + l.value, 0);

    const prodTxt = products.map(p => `${p.name} margem ${p.marginPct.toFixed(0)}% (custo R$${p.custo.toFixed(2)}, preço R$${p.precoPix.toFixed(2)})`);

    const aPagar = contas.filter(c => c.tipo === "pagar" && c.status !== "paga");
    const totalPagar = aPagar.reduce((a, c) => a + c.valor, 0);
    const vencidas = aPagar.filter(c => c.status === "vencida");
    const aReceber = contas.filter(c => c.tipo === "receber" && c.status !== "paga");
    const totalReceber = aReceber.reduce((a, c) => a + c.valor, 0);

    return [
      `Financeiro (DRE ${periodoLabel}): receita bruta ${brl(receita)}, CMV ${brl(cmv)}, lucro bruto ${brl(lucroBruto)} (margem ${margemPct.toFixed(0)}%), resultado do período ${brl(resultado)}${resultado < 0 ? " (no vermelho)" : ""}.`,
      prodTxt.length ? `Margem por produto: ${prodTxt.join("; ")}.` : "",
      `Contas a pagar: ${brl(totalPagar)} em aberto (${vencidas.length} vencida(s)); a receber: ${brl(totalReceber)}.`,
    ].filter(Boolean);
  } catch {
    return [];
  }
}

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
    ...estoqueLines(),
    ...financeiroLines(),
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
