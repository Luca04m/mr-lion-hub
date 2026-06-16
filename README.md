# Mr. Lion Hub

Central de operações da **Casa Mr. Lion** (whisky brasileiro premium). App React single-page, hand-coded, com gestão operacional + módulos financeiro e de estoque gated.

## Stack
React 18 · Vite 5 · react-router 6 (**BrowserRouter**) · TypeScript · Tailwind 3 + shadcn/radix · Recharts · framer-motion · dnd-kit · cmdk · Supabase (realtime/persistência do core) · zustand + localStorage (estoque).

## Design system
2 temas via CSS vars HSL — **Light (default)** + **Dark (preto sóbrio)**, alternáveis pelo toggle no header (persiste em `localStorage['mrlion_theme']`). Tipografia **Montserrat** (números tabulares). Direção sóbria/premium: neutros + dourado de marca discreto como acento, status dessaturados, bordas pouco arredondadas (8/6px), sem glows/gradientes chamativos. Tokens em `src/index.css`; componentes reutilizáveis em `src/components/pro/`.

## Rotas
| Rota | Conteúdo | Acesso |
|---|---|---|
| `/` | Login (seleção de usuário + senha) | público |
| `/overview` | Visão geral operacional (KPIs, atividade, CRM, tarefas) | logado |
| `/tasks` | Tarefas (kanban dnd, lista, por pessoa/área) | logado |
| `/calendar` | Calendário de reuniões/conteúdo | logado |
| `/campaigns` | Campanhas (fases, ângulos, ads, copy) | logado |
| `/content` | Conteúdo social (agenda de posts) | logado |
| `/revendedores` | CRM B2B | logado |
| `/financeiro` `/financeiro/lucro` `/financeiro/caixa` | Financeiro v2 (Comando · Lucro/Margem · Caixa) | **PRIVATE_USERS** |
| `/estoque` | Estoque & Produção (6 seções, motor de manufatura) | **PRIVATE_USERS** |

Gate em `src/components/PrivateRoute.tsx` lê `mrlion_user` (localStorage); fora de `PRIVATE_USERS` (`src/lib/types.ts`) → redireciona p/ `/overview`.

## Estrutura
```
src/
├── components/{layout/AppLayout, pro/*, ui/* (shadcn), ...}
├── pages/{LoginPage, OverviewPage, TasksPage, CalendarPage, CampaignsPage, ContentPage, RevendedoresPage, NotFound, Placeholder}
├── financeiro/{data, lib, charts, telas/{Comando,Lucro,Caixa}, FinanceiroLayout}
├── estoque/{types,engine,store,mock,ui (lógica de manufatura), sections/* (6 seções), EstoqueLayout}
├── lib/{store, supabase, types, utils}   ← data layer do core (NÃO alterar sem cuidado)
└── hooks/{use-realtime, ...}
```

## Rodar
```bash
npm install
npm run dev      # http://localhost:8080
npm run build    # gera dist/
npm run preview  # serve o build
```

## Deploy (Cloudflare Pages — projeto "mrlionhub")
SPA com `public/_redirects` (`/* /index.html 200`) já incluído. `base: "/"`.
```bash
npm run build
npx wrangler login                                  # auth interativa (1ª vez)
npx wrangler pages deploy dist --project-name mrlionhub
```
Ou via dashboard CF Pages: criar projeto "mrlionhub", build command `npm run build`, output `dist`.

## ⚠️ Segurança (pendências conhecidas — fora do escopo deste build)
- Senha de acesso `APP_PASSWORD` em texto puro (`src/lib/types.ts`).
- Supabase URL + anon key hardcoded como fallback (`src/lib/supabase.ts`) — vão no bundle JS público.
- Gate de acesso é **client-side** (localStorage) — não é autenticação real/RLS.
- Seed de ~73 leads B2B em `src/lib/store.ts` (vai no bundle).

Antes de um deploy público amplo: migrar segredos p/ variáveis de ambiente, considerar Supabase Auth + RLS, e remover o seed do bundle. O conteúdo sensível fica atrás do login, mas o bundle é inspecionável.

## Notas
- Estoque: motor de manufatura (`src/estoque/{types,engine,store,mock}.ts`) portado **verbatim** do app original em uso — as 9 regras (disponibilidade, custo c/ mão de obra R$4,50/un, produção 2 estágios líquido→granel 0,75 L/garrafa, ponto de reposição, etc.) não foram alteradas. Runtime: zustand + `localStorage['mrlion-estoque-v5']`.
- Financeiro: números reconciliados com o ground-truth (DRE Jan/Fev 2026, preços PIX 152/171/107, margens reais Jan). Cada bloco carrega badge de proveniência (real/parcial/ilustrativo). Projeções de caixa/coortes/aging são **ilustrativas** (modelos), explicitamente rotuladas.
