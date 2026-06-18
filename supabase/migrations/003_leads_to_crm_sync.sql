-- ════════════════════════════════════════════════════════════════════════════
-- 003 — Ingestão de leads da LP parceiros.casamrlion.com.br → CRM (revendedores)
-- ────────────────────────────────────────────────────────────────────────────
-- Contexto: os leads B2B caem em public.leads_revenda (Edge Function lead-revenda,
-- MESMO project amxgmjvxsmggffsmvlbu que o Hub). Este script faz cada lead virar
-- automaticamente um card "Novo Lead" no pipeline do CRM (tabela revendedores),
-- em tempo real (revendedores já está na publication supabase_realtime).
--
-- Estratégia (decisão Luca 2026-06-18): trigger AFTER INSERT + backfill dos
-- leads já existentes. NÃO sincroniza de volta (o comercial opera no CRM; a
-- leads_revenda é só captura). Idempotente: on conflict (id) do nothing.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Função de mapeamento (compartilhada pelo trigger e pelo backfill) ─────────
create or replace function public.crm_upsert_from_lead(p public.leads_revenda)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.revendedores (
    id, nome, responsavel, status, canal, cidade, volume, ultima, obs,
    whatsapp, instagram, email, telefone, tags, score,
    proxima_acao, volume_historico, historico
  ) values (
    'lp-' || p.event_id,                           -- chave canônica = event_id (dedup c/ planilha)
    coalesce(nullif(trim(p.nome), ''), 'Lead sem nome'),
    '',                                            -- responsavel: a definir no CRM
    case p.status
      when 'new'       then 'Novo Lead'
      when 'contacted' then 'Em Negociação'
      when 'qualified' then 'Em Negociação'
      when 'won'       then 'Ativo'
      when 'lost'      then 'Inativo'
      else 'Novo Lead'
    end,
    'Outros',                                      -- canal (enum não tem "LP"; tag distingue)
    coalesce(p.cidade, '') ||
      case when coalesce(p.uf, '') <> '' then '/' || p.uf else '' end,
    0,                                             -- volume (numérico; faixa vai pra obs)
    to_char(p.created_at, 'YYYY-MM-DD'),
    trim(both ' ·' from concat_ws(' · ',
      nullif('PDV: '    || coalesce(p.tipo_pdv, ''), 'PDV: '),
      nullif('Volume: ' || coalesce(p.volume, ''),   'Volume: '),
      nullif('CNPJ: '   || coalesce(p.cnpj, '••••' || p.cnpj_last4), 'CNPJ: '),
      nullif(p.mensagem, '')
    )),
    coalesce(p.whatsapp, '••••' || p.whatsapp_last4),
    '',                                            -- instagram
    coalesce(p.email, ''),
    coalesce(p.whatsapp, ''),                       -- telefone
    array_remove(array['Lead LP', p.tipo_pdv], null),
    0,                                             -- score (recalculado no app)
    null,                                          -- proxima_acao
    '[]'::jsonb,                                   -- volume_historico
    jsonb_build_array(jsonb_build_object(
      'id',        (extract(epoch from p.created_at) * 1000)::bigint,
      'data',      to_char(p.created_at, 'YYYY-MM-DD'),
      'tipo',      'Outro',
      'descricao', 'Lead capturado via landing parceiros.casamrlion.com.br' ||
                   case when coalesce(p.utm_source, '') <> ''
                        then ' (origem: ' || p.utm_source || ')' else '' end,
      'autor',     'Sistema'
    ))
  )
  on conflict (id) do nothing;
end;
$$;

-- ── Trigger: cada novo lead vira um card no CRM ───────────────────────────────
create or replace function public.sync_lead_to_revendedor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.crm_upsert_from_lead(NEW);
  return NEW;
end;
$$;

drop trigger if exists trg_lead_to_revendedor on public.leads_revenda;
create trigger trg_lead_to_revendedor
  after insert on public.leads_revenda
  for each row
  execute function public.sync_lead_to_revendedor();

-- ── Backfill dos leads já em leads_revenda ────────────────────────────────────
-- Os 287 leads da planilha já foram importados (com status comercial). on conflict
-- (id) do nothing → preserva esses e adiciona só o que faltou (ex.: os 6 órfãos
-- pré-06/mai que nunca foram pra planilha). Idempotente.
do $$ declare r public.leads_revenda; begin
  for r in select * from public.leads_revenda loop
    perform public.crm_upsert_from_lead(r);
  end loop; end $$;
