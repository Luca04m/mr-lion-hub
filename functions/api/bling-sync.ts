// ════════════════════════════════════════════════════════════════════════
// Cloudflare Pages Function · /api/bling-sync
// Proxy read-only entre o Hub (browser) e a API do Bling (OAuth v3).
// Busca os pedidos de venda desde `since` e devolve os itens normalizados
// (codigo/descricao/quantidade) p/ o estoque do Hub dar baixa por pedido.
//
// Espelha o fluxo já validado em Apps/Bling MCP/scripts/reconcile_wc_bling.py:
//   • TOKEN_URL  = /Api/v3/oauth/token  (Basic client_id:secret + refresh_token)
//   • LISTA      = GET /pedidos/vendas?dataInicial&pagina&limite
//   • DETALHE    = GET /pedidos/vendas/{id}  → data.itens[]
//
// ── Provisioning (ver functions/BLING_SYNC_SETUP.md) ──
//   KV  : binding BLING_KV (guarda o token rotativo — refresh_token gira a cada refresh)
//   secrets: BLING_CLIENT_ID, BLING_CLIENT_SECRET, BLING_SEED_REFRESH_TOKEN (seed 1x)
// ════════════════════════════════════════════════════════════════════════

const BLING = 'https://api.bling.com.br/Api/v3'
const TOKEN_URL = `${BLING}/oauth/token`
const TOKEN_KEY = 'bling_token'

interface TokenSet {
  access_token: string
  refresh_token: string
  expires_at: number // epoch ms
}

/** Lê o token do KV; refresca (e regrava o refresh_token rotacionado) se faltar < 30min. */
async function getAccessToken(env: any): Promise<string> {
  const now = Date.now()
  const raw = await env.BLING_KV?.get(TOKEN_KEY)
  let tok: TokenSet | null = raw ? JSON.parse(raw) : null

  if (tok?.access_token && tok.expires_at - now > 30 * 60 * 1000) return tok.access_token

  // Seed: na 1ª vez (KV vazio) usa o refresh_token do secret de bootstrap.
  const refreshToken = tok?.refresh_token || env.BLING_SEED_REFRESH_TOKEN
  if (!refreshToken) throw new Error('sem refresh_token (KV vazio e BLING_SEED_REFRESH_TOKEN ausente)')
  if (!env.BLING_CLIENT_ID || !env.BLING_CLIENT_SECRET) throw new Error('faltam BLING_CLIENT_ID / BLING_CLIENT_SECRET')

  const basic = btoa(`${env.BLING_CLIENT_ID}:${env.BLING_CLIENT_SECRET}`)
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  })
  if (!resp.ok) throw new Error(`refresh falhou ${resp.status}: ${(await resp.text()).slice(0, 200)}`)
  const d: any = await resp.json()
  const next: TokenSet = {
    access_token: d.access_token,
    refresh_token: d.refresh_token || refreshToken, // Bling rotaciona o refresh
    expires_at: now + (d.expires_in ?? 21600) * 1000,
  }
  await env.BLING_KV?.put(TOKEN_KEY, JSON.stringify(next))
  return next.access_token
}

// Situações ignoradas no baixa-estoque (padrão Bling: 12 = Cancelado).
const SITUACOES_IGNORADAS = new Set<number>([12])

const ymd = (s: string | null): string => {
  // aceita ISO/data; devolve YYYY-MM-DD. default: 7 dias atrás.
  const d = s ? new Date(s) : new Date(Date.now() - 7 * 864e5)
  return Number.isNaN(d.getTime())
    ? new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)
    : d.toISOString().slice(0, 10)
}

export const onRequestGet = async (ctx: any) => {
  const url = new URL(ctx.request.url)
  const since = ymd(url.searchParams.get('since'))
  try {
    const access = await getAccessToken(ctx.env)
    const bh = { Authorization: `Bearer ${access}`, Accept: 'application/json' }

    // 1) Lista paginada de pedidos de venda desde `since`.
    // ⚠️ Cloudflare free = 50 subrequests/invocação. Orçamento: ≤4 páginas + ≤38
    //    detalhes + 1 refresh = 43. Janela normal (since=hoje) cabe folgado.
    const pedidos: any[] = []
    for (let pg = 1; pg <= 4; pg++) {
      const r = await fetch(`${BLING}/pedidos/vendas?dataInicial=${since}&pagina=${pg}&limite=100`, { headers: bh })
      if (!r.ok) {
        if (pg === 1) throw new Error(`lista falhou ${r.status}`)
        break
      }
      const data: any[] = (await r.json())?.data ?? []
      pedidos.push(...data)
      if (data.length < 100) break
    }

    // 2) Detalhe (itens) só dos pedidos não-cancelados, MAIS ANTIGOS primeiro
    //    (processa em ordem cronológica; o resto vem na próxima sync via nextSince).
    const elegiveis = pedidos
      .filter((p) => !SITUACOES_IGNORADAS.has((p.situacao || {}).id))
      .sort((a, b) => (String(a.data) < String(b.data) ? -1 : 1))
    const CAP = 38
    const alvo = elegiveis.slice(0, CAP)
    const truncated = elegiveis.length > CAP
    const orders: any[] = []
    for (const p of alvo) {
      const r = await fetch(`${BLING}/pedidos/vendas/${p.id}`, { headers: bh })
      if (!r.ok) continue
      const d: any = (await r.json())?.data ?? {}
      orders.push({
        id: String(p.id),
        numero: p.numero,
        data: p.data,
        situacaoId: (p.situacao || {}).id ?? (d.situacao || {}).id,
        itens: (d.itens ?? []).map((it: any) => ({
          codigo: it.codigo ?? (it.produto || {}).codigo ?? null,
          descricao: it.descricao ?? null,
          quantidade: Number(it.quantidade) || 0,
        })),
      })
    }

    // Se truncou, a próxima sync retoma da data do último processado (dedup evita re-aplicar).
    const nextSince = truncated ? (alvo[alvo.length - 1]?.data ?? since) : null

    return Response.json({
      ok: true,
      since,
      total: pedidos.length,
      aplicaveis: orders.length,
      truncated,
      nextSince,
      serverTime: new Date().toISOString(),
      orders,
    })
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 })
  }
}
