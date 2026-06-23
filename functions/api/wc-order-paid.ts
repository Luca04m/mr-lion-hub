// ════════════════════════════════════════════════════════════════════════
// Cloudflare Pages Function · POST /api/wc-order-paid
// Gatilho de baixa de estoque: o WooCommerce chama este endpoint quando um
// pedido é PAGO (snippet PHP em woocommerce_payment_complete). Para cada item
// vendido, mapeia o SKU → produto acabado e chama a RPC `aplicar_venda` no
// Supabase (service-role), que baixa o estoque de forma IDEMPOTENTE.
//
// Idempotência: event_id = `wc_<order_id>_<pa_slug>` → UNIQUE em
// movimentos.bling_event_id. Reenvio do mesmo pedido não baixa de novo.
//
// ── Provisioning (Cloudflare Pages → Settings → Variables & Secrets) ──
//   SUPABASE_URL               = https://amxgmjvxsmggffsmvlbu.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  = (service-role JWT — bypassa RLS)
//   WC_WEBHOOK_TOKEN           = token compartilhado validado no header X-Hub-Token
// ════════════════════════════════════════════════════════════════════════

// Espelho de src/estoque/bling.ts (codigo Bling/WC → produto acabado do estoque).
// As variações Completo/Garrafa/Pingente são a MESMA garrafa da linha → mesmo PA.
const SKU_TO_PA: Record<string, string> = {
  '003': 'pa_honey', '871': 'pa_honey', '872': 'pa_honey',
  '222': 'pa_cappuccino', '333': 'pa_cappuccino', '111': 'pa_cappuccino',
  '779': 'pa_blended', '778': 'pa_blended', '780': 'pa_blended',
}

/** Resolve SKU (e nome como fallback) → slug do produto acabado, ou null. */
function mapToPA(sku: string | null, nome: string | null): string | null {
  if (sku && SKU_TO_PA[sku]) return SKU_TO_PA[sku]
  const d = (nome ?? '').toLowerCase()
  if (!d) return null
  if (d.includes('black')) return null // Black Honey não tem PA no estoque
  if (d.includes('blended')) return 'pa_blended'
  if (d.includes('capucc') || d.includes('cappucc')) return 'pa_cappuccino'
  if (d.includes('honey')) return 'pa_honey'
  return null
}

interface LineItem { sku?: string | null; quantity?: number | string; name?: string | null }

export const onRequestPost = async (ctx: any) => {
  const { env, request } = ctx
  try {
    // 1) autenticação do webhook (token compartilhado)
    const token = request.headers.get('X-Hub-Token') || request.headers.get('x-hub-token')
    if (!env.WC_WEBHOOK_TOKEN || token !== env.WC_WEBHOOK_TOKEN) {
      return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }
    const supabaseUrl = env.SUPABASE_URL || 'https://amxgmjvxsmggffsmvlbu.supabase.co'
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return Response.json({ ok: false, error: 'sem SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })

    // 2) payload do pedido (vindo do snippet PHP no payment_complete)
    const body: any = await request.json()
    const orderId = String(body?.id ?? body?.order_id ?? '')
    const status = String(body?.status ?? 'paid').toLowerCase()
    const lineItems: LineItem[] = body?.line_items ?? body?.items ?? []
    if (!orderId) return Response.json({ ok: false, error: 'sem order id' }, { status: 400 })
    // só processa pedido pago (o snippet já filtra; este guard é defensivo)
    if (!['paid', 'processing', 'completed'].includes(status)) {
      return Response.json({ ok: true, skipped: `status=${status}` })
    }

    // 3) agrega quantidade por produto acabado (Completo+Garrafa+Pingente caem no mesmo PA)
    const porPA = new Map<string, number>()
    const naoMapeados: { sku?: string | null; name?: string | null; qty: number }[] = []
    for (const li of lineItems) {
      const qty = Number(li.quantity) || 0
      if (qty <= 0) continue
      const pa = mapToPA(li.sku ?? null, li.name ?? null)
      if (!pa) { naoMapeados.push({ sku: li.sku, name: li.name, qty }); continue }
      porPA.set(pa, (porPA.get(pa) ?? 0) + qty)
    }

    // 4) baixa idempotente por (pedido × produto) via RPC
    const resultados: { pa: string; qty: number; resultado: string }[] = []
    for (const [pa, qty] of porPA) {
      const r = await fetch(`${supabaseUrl}/rest/v1/rpc/aplicar_venda`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_item_slug: pa,
          p_qty: qty,
          p_event_id: `wc_${orderId}_${pa}`,
          p_motivo: `Venda WooCommerce #${orderId}`,
        }),
      })
      const txt = await r.text()
      resultados.push({ pa, qty, resultado: r.ok ? txt.replace(/^"|"$/g, '') : `erro_${r.status}:${txt.slice(0, 120)}` })
    }

    return Response.json({ ok: true, orderId, aplicados: resultados, naoMapeados })
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 })
  }
}
