# Bling → Estoque · setup (1x)

A função `functions/api/bling-sync.ts` puxa os pedidos de venda do Bling e o
estoque do Hub dá baixa por pedido (`Sincronizar Bling` na tela de Estoque +
auto-sync ao abrir, a cada >15min). Idempotente: cada pedido só baixa **uma vez**
(dedup por id em `blingSync.pedidosAplicados`, persistido no navegador).

O código já está pronto. Falta só **provisionar** no Cloudflare Pages (projeto `mrlionhub`):

## 1. Criar o KV (guarda o token rotativo)

```bash
cd "Apps/Mr. Lion Hub"
npx wrangler kv namespace create BLING_KV    # copia o "id" retornado
```

No `wrangler.toml`, descomenta o bloco `[[kv_namespaces]]` e cola o `id`.

## 2. Secrets (Pages → Settings → Variables and Secrets → **Encrypt**)

| Secret | De onde tirar |
|---|---|
| `BLING_CLIENT_ID` | `Apps/Bling MCP/.env` → `BLING_CLIENT_ID` |
| `BLING_CLIENT_SECRET` | `Apps/Bling MCP/.env` → `BLING_CLIENT_SECRET` |
| `BLING_SEED_REFRESH_TOKEN` | `Apps/Bling MCP/.tokens.json` → campo `refresh_token` (atual) |

> O `BLING_SEED_REFRESH_TOKEN` é só **seed de bootstrap**: na 1ª chamada a função
> refresca a partir dele e grava o token rotacionado no KV. Daí em diante o KV é a
> fonte da verdade (o Bling **rotaciona** o refresh_token a cada refresh — por isso
> precisa do KV pra persistir; secret sozinho não basta).
>
> ⚠️ Pega o `refresh_token` **fresco** (roda `Apps/Bling MCP/.venv/bin/python
> scripts/bling_refresh.py` antes de copiar) — se o app MCP refrescar depois, o
> token do secret vira obsoleto e você re-seeda.

CLI alternativo aos secrets pela UI:
```bash
npx wrangler pages secret put BLING_CLIENT_ID --project-name mrlionhub
npx wrangler pages secret put BLING_CLIENT_SECRET --project-name mrlionhub
npx wrangler pages secret put BLING_SEED_REFRESH_TOKEN --project-name mrlionhub
```

## 3. Deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name mrlionhub --branch main --commit-dirty=true
```

## 4. Testar

- Abre `https://mrlionhub.com.br/estoque` → o header mostra **Bling · há Xmin · N baixas**.
- Ou direto: `https://mrlionhub.com.br/api/bling-sync?since=2026-06-01`
  → `{ ok:true, total, aplicaveis, orders:[…] }`. Se `ok:false`, o `error` diz o quê
  (token, secret faltando, etc.).

## Mapeamento SKU Bling → produto acabado (`src/estoque/bling.ts`)

| Linha | Códigos Bling | Item estoque |
|---|---|---|
| Honey | `003` `871` `872` | `pa_honey` |
| Cappuccino | `222` `333` `111` | `pa_cappuccino` |
| Blended | `779` `778` `780` | `pa_blended` |
| Black Honey | `777` | — (sem PA · cai em "não mapeados") |

Fallback por descrição (`blended`/`cappucc`/`honey`) cobre SKUs novos. Variação
Completo/Garrafa/Pingente = mesma garrafa de 750ml → baixa 1 do produto acabado.

## Limitações conhecidas (MVP)

- **Baixa = produto acabado** (`pa_*`). Não consome granel/embalagem via BOM — isso
  é o fluxo de **produção** (envase), não de venda. Saldo trava em 0 (não vai negativo).
- **Situação 12 (Cancelado)** é ignorada. Se a conta usar ids customizados, ajustar
  `SITUACOES_IGNORADAS` em `functions/api/bling-sync.ts`.
- **Endpoint público** (`/api/bling-sync`): devolve só dados de produto/pedido
  (codigo/descrição/qtd/nº/data) — sem nome/CPF de cliente. Pra travar, pôr atrás de
  Cloudflare Access.
- **Black Honey** ainda não existe como produto acabado no estoque.
