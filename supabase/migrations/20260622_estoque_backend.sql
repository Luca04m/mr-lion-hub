-- ═══════════════════════════════════════════════════════════════════════════
-- Mr. Lion — Backend de ESTOQUE (projeto do Hub: amxgmjvxsmggffsmvlbu)
-- Consolida: manufatura_core (20260608) + wip_granel (20260611)
--   + seed REAL (contagem física 18/06 João = contagem 22/06 Luca)
--   + RPC aplicar_venda  (idempotente, service-role — usada pelo webhook do WC)
--   + RPC saldos_estoque (anon, sem custo — usada pelo Hub p/ exibir)
-- Compartilha o projeto com o CRM (meetings/tasks/revendedores) → tudo aditivo,
-- idempotente (IF NOT EXISTS / CREATE OR REPLACE) e SEM tocar auth.users
-- (omitido o trigger on_auth_user_created do core original).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

-- ── perfis + papéis (sem auto-trigger em auth.users) ──
CREATE TABLE IF NOT EXISTS profiles (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('operator','manager','producao')),
  full_name TEXT,
  ver_custo BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (user_id)
);
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1; $$;
CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(get_user_role() = 'manager', false); $$;

-- ════════════════════════════ TABELAS ════════════════════════════
CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE, nome TEXT NOT NULL, contato TEXT,
  lead_time_dias INTEGER NOT NULL DEFAULT 0 CHECK (lead_time_dias >= 0),
  ativo BOOLEAN NOT NULL DEFAULT true, bling_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE, sku TEXT, nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('materia_prima','embalagem','produto_intermediario','produto_acabado')),
  categoria TEXT NOT NULL CHECK (categoria IN
    ('honey','cappuccino','blended','liquido','po','aditivo','granel',
     'garrafa','rotulo','pingente','fechamento','caixa')),
  uom TEXT NOT NULL CHECK (uom IN ('kg','g','L','ml','un')),
  estoque NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (estoque >= 0),
  min NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (min >= 0),
  max NUMERIC(14,3),
  custo_medio NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (custo_medio >= 0),
  foto_url TEXT,
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  lead_time_dias INTEGER, uso_medio_diario NUMERIC(14,3),
  perecivel BOOLEAN NOT NULL DEFAULT false,
  classe_abc TEXT CHECK (classe_abc IN ('A','B','C')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  bling_id TEXT, bling_deposito_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_itens_tipo  ON itens(tipo);
CREATE INDEX IF NOT EXISTS idx_itens_ativo ON itens(ativo);

CREATE TABLE IF NOT EXISTS receitas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE, produto_id UUID NOT NULL REFERENCES itens(id) ON DELETE CASCADE,
  nome TEXT NOT NULL, rendimento NUMERIC(14,3) NOT NULL DEFAULT 1 CHECK (rendimento > 0),
  incompleta BOOLEAN NOT NULL DEFAULT false,
  etapa TEXT NOT NULL DEFAULT 'completa' CHECK (etapa IN ('liquido','envase','completa')),
  saida_id UUID REFERENCES itens(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS bom_componentes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receita_id UUID NOT NULL REFERENCES receitas(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES itens(id) ON DELETE RESTRICT,
  quantidade NUMERIC(14,4) NOT NULL CHECK (quantidade > 0), uom TEXT NOT NULL,
  UNIQUE (receita_id, item_id)
);
CREATE TABLE IF NOT EXISTS ordens_producao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo TEXT NOT NULL, produto_id UUID NOT NULL REFERENCES itens(id),
  receita_id UUID NOT NULL REFERENCES receitas(id),
  qtd_planejada NUMERIC(14,3) NOT NULL CHECK (qtd_planejada > 0), qtd_real NUMERIC(14,3),
  status TEXT NOT NULL DEFAULT 'planejada' CHECK (status IN ('planejada','em_producao','concluida','cancelada')),
  prioridade INTEGER NOT NULL DEFAULT 1,
  criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), concluida_em TIMESTAMPTZ, created_by UUID REFERENCES auth.users(id)
);
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo TEXT NOT NULL, fornecedor_id UUID NOT NULL REFERENCES fornecedores(id),
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','parcial','recebida','cancelada')),
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), recebida_em TIMESTAMPTZ, created_by UUID REFERENCES auth.users(id)
);
CREATE TABLE IF NOT EXISTS po_linhas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES itens(id),
  qtd NUMERIC(14,3) NOT NULL CHECK (qtd > 0), preco_unitario NUMERIC(14,4) NOT NULL DEFAULT 0,
  qtd_recebida NUMERIC(14,3) NOT NULL DEFAULT 0
);

-- ── movimentos (ledger APPEND-ONLY) — bling_event_id UNIQUE = idempotência ──
CREATE TABLE IF NOT EXISTS movimentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES itens(id),
  delta NUMERIC(14,3) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN
    ('recebimento','consumo_producao','entrada_producao','venda','ajuste','transferencia','perda')),
  ref_tipo TEXT CHECK (ref_tipo IN ('po','mo','venda','ajuste','bling')),
  ref_id UUID, motivo TEXT, usuario TEXT, user_id UUID REFERENCES auth.users(id),
  bling_event_id TEXT UNIQUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mov_item ON movimentos(item_id);
CREATE INDEX IF NOT EXISTS idx_mov_data ON movimentos(criado_em DESC);

DROP TRIGGER IF EXISTS itens_updated_at ON itens;
CREATE TRIGGER itens_updated_at BEFORE UPDATE ON itens FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ════════════════════════════ RPCs ════════════════════════════
CREATE OR REPLACE FUNCTION _aplicar(
  p_item_id UUID, p_delta NUMERIC, p_tipo TEXT,
  p_ref_tipo TEXT DEFAULT NULL, p_ref_id UUID DEFAULT NULL,
  p_motivo TEXT DEFAULT NULL, p_bling_event TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE itens SET estoque = GREATEST(0, estoque + p_delta), updated_at = NOW() WHERE id = p_item_id;
  INSERT INTO movimentos (item_id, delta, tipo, ref_tipo, ref_id, motivo, user_id, usuario, bling_event_id)
  VALUES (p_item_id, p_delta, p_tipo, p_ref_tipo, p_ref_id, p_motivo, auth.uid(),
          (SELECT full_name FROM profiles WHERE user_id = auth.uid()), p_bling_event);
END; $$;

CREATE OR REPLACE FUNCTION ajustar_estoque(
  p_item_id UUID, p_delta NUMERIC, p_tipo TEXT DEFAULT 'ajuste', p_motivo TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'não autenticado'; END IF;
  PERFORM _aplicar(p_item_id, p_delta, p_tipo, 'ajuste', NULL, p_motivo, NULL);
END; $$;

-- ── NOVO: baixa de venda idempotente (webhook do WooCommerce, via service-role) ──
-- Resolve o item por slug (pa_honey/pa_cappuccino/pa_blended), grava 1 movimento de
-- venda e decrementa o saldo. ON CONFLICT no bling_event_id garante "uma vez por
-- (pedido × produto)". NÃO exige auth.uid() — roda como service-role no webhook.
CREATE OR REPLACE FUNCTION aplicar_venda(
  p_item_slug TEXT, p_qty NUMERIC, p_event_id TEXT, p_motivo TEXT DEFAULT NULL
) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_item_id UUID; v_rows INT;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN RETURN 'qty_invalida'; END IF;
  SELECT id INTO v_item_id FROM itens WHERE slug = p_item_slug LIMIT 1;
  IF v_item_id IS NULL THEN RETURN 'item_nao_encontrado:' || p_item_slug; END IF;
  INSERT INTO movimentos (item_id, delta, tipo, ref_tipo, motivo, usuario, bling_event_id)
  VALUES (v_item_id, -ABS(p_qty), 'venda', 'venda', COALESCE(p_motivo, 'Venda WooCommerce'), 'WooCommerce', p_event_id)
  ON CONFLICT (bling_event_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN 'duplicado'; END IF;
  UPDATE itens SET estoque = GREATEST(0, estoque - ABS(p_qty)), updated_at = NOW() WHERE id = v_item_id;
  RETURN 'aplicado';
END; $$;
REVOKE ALL ON FUNCTION aplicar_venda(TEXT,NUMERIC,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION aplicar_venda(TEXT,NUMERIC,TEXT,TEXT) TO service_role;

-- ── NOVO: saldos p/ o Hub exibir (sem custo, leitura pública) ──
CREATE OR REPLACE FUNCTION saldos_estoque()
RETURNS TABLE (slug TEXT, sku TEXT, nome TEXT, tipo TEXT, categoria TEXT, uom TEXT, estoque NUMERIC, min NUMERIC)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT slug, sku, nome, tipo, categoria, uom, estoque, min FROM itens WHERE ativo ORDER BY tipo, slug; $$;
GRANT EXECUTE ON FUNCTION saldos_estoque() TO anon, authenticated, service_role;

-- ════════════════════════════ RLS ════════════════════════════
ALTER TABLE itens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentos ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['fornecedores','itens','receitas','bom_componentes','ordens_producao','purchase_orders','po_linhas','movimentos'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON %I;', t, t);
    EXECUTE format('CREATE POLICY %I_select ON %I FOR SELECT USING (auth.uid() IS NOT NULL);', t, t);
  END LOOP;
END $$;

-- ════════════════════════════ SEED (contagem física 18/06) ════════════════════════════
INSERT INTO fornecedores (slug, nome, contato, lead_time_dias) VALUES
  ('f-lamas','Lamas (produção interna)','Álcool / malte',0),
  ('f-coopermel','Coopermel Bocaiúva','Mel',7),
  ('f-fracarolli','Irmãos Fracarolli','Aromas / corante',7),
  ('f-atacado','Atacadista','Leite / creme / açúcar',7),
  ('f-sulfal','Sulfal','CMC / citrato',2),
  ('f-premier','Premier Pack','Garrafa / rolha',7),
  ('f-inoove','Inoove Embalagens','Tubete',30),
  ('f-flavio','Flávio / Leão ou Coroa','Pingente',30),
  ('f-fabiana','Fabiana Embalagens','Caixas',30),
  ('f-graphix','Graphix','Rótulos',7)
ON CONFLICT (slug) DO NOTHING;

-- itens: slug, sku, nome, tipo, categoria, uom, estoque, min, custo_medio
INSERT INTO itens (slug, sku, nome, tipo, categoria, uom, estoque, min, custo_medio) VALUES
  ('alcool','MP-001','Álcool de cereais 96%','materia_prima','liquido','L',800,200,11.42),
  ('malte','MP-002','Malte whisky 56GL','materia_prima','liquido','L',300,100,42.63),
  ('mel','MP-003','Mel silvestre','materia_prima','liquido','kg',225,12,24.20),
  ('acucar','MP-004','Açúcar','materia_prima','po','kg',135,20,5.00),
  ('aroma_mel','MP-005','Aroma de mel','materia_prima','aditivo','L',5,1.0,135.77),
  ('creme_leite','MP-006','Creme de leite','materia_prima','liquido','kg',0,5,19.31),
  ('leite_cond','MP-007','Leite condensado','materia_prima','liquido','kg',0,6,16.76),
  ('aroma_cap','MP-008','Aroma de cappuccino','materia_prima','aditivo','L',5,0.8,128.08),
  ('cmc','MP-009','CMC (espessante)','materia_prima','po','kg',0.5,0.3,38.50),
  ('corante','MP-010','Corante caramelo','materia_prima','aditivo','L',5,0.4,54.88),
  ('citrato','MP-011','Citrato de sódio','materia_prima','po','kg',0.5,0.2,42.79),
  ('garrafa_hb','EM-001','Garrafa Honey/Blended','embalagem','garrafa','un',478,120,11.74),
  ('garrafa_cap','EM-002','Garrafa Cappuccino','embalagem','garrafa','un',143,80,23.83),
  ('rolha','EM-003','Rolha','embalagem','fechamento','un',6315,160,1.28),
  ('tubo_hb','EM-004','Tubete Honey/Blended','embalagem','caixa','un',1460,150,14.12),
  ('tubo_cap','EM-005','Tubete Cappuccino','embalagem','caixa','un',1562,80,11.36),
  ('rotulo_honey','EM-006','Rótulo Honey','embalagem','rotulo','un',969,120,1.43),
  ('rotulo_cap','EM-007','Rótulo Cappuccino','embalagem','rotulo','un',150,80,1.43),
  ('rotulo_blend','EM-008','Rótulo Blended','embalagem','rotulo','un',696,50,1.43),
  ('ping_leao','EM-009','Pingente Leão','embalagem','pingente','un',1800,120,2.95),
  ('ping_coroa','EM-010','Pingente Coroa','embalagem','pingente','un',3900,60,2.95),
  ('selo_ipi','EM-012','Selo IPI','embalagem','fechamento','un',2000,500,0.03),
  ('caixa6','EM-013','Caixa 6 unidades','embalagem','caixa','un',30,20,3.30),
  ('caixa23','EM-014','Caixa 2–3 unidades','embalagem','caixa','un',15,20,3.30),
  ('caixa1','EM-015','Caixa 1 unidade','embalagem','caixa','un',84,50,3.30),
  ('colar','EM-016','Colar / correntinha','embalagem','fechamento','un',1875,150,1.30),
  ('caixa_blended','EM-017','Estojo Blended','embalagem','caixa','un',1654,50,3.30),
  ('granel_honey','WIP-001','Granel Honey (tanque)','produto_intermediario','granel','L',900,150,12.28),
  ('granel_cappuccino','WIP-002','Granel Cappuccino (tanque)','produto_intermediario','granel','L',180,60,12.03),
  ('pa_honey','PA-001','Mr. Lion Honey 750ml','produto_acabado','honey','un',21,60,45.26),
  ('pa_cappuccino','PA-002','Mr. Lion Cappuccino 750ml','produto_acabado','cappuccino','un',6,40,54.40),
  ('pa_blended','PA-003','Mr. Lion Blended 750ml','produto_acabado','blended','un',46,50,36.05)
ON CONFLICT (slug) DO UPDATE SET
  estoque = EXCLUDED.estoque, min = EXCLUDED.min, custo_medio = EXCLUDED.custo_medio,
  nome = EXCLUDED.nome, sku = EXCLUDED.sku, updated_at = NOW();
