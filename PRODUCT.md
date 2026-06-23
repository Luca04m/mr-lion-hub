# PRODUCT.md — Mr. Lion Hub

> Hub operacional interno da **Casa Mr. Lion** (whisky brasileiro premium, D2C).
> Ferramenta de equipe, não site público. Register: **product** (design SERVE a tarefa).

## O que é
Painel único onde a equipe Mr. Lion toca a operação: tarefas, calendário, campanhas,
CRM de revendedores, assistente de IA, e — gated — Financeiro (DRE/lucro/caixa) e
Estoque (produção 2-estágios, compras, movimentações). SPA React montado em
`mrlionhub.com.br` (Cloudflare Pages). Dados em localStorage (seeds) + Supabase
(realtime/presença) + Cloudflare Workers (assistente IA, Bling sync).

## Quem usa
Equipe de 7: `Luca, João, Luhan, Pedro, Guilherme, Ronaldo, MD Chefe`.
Módulos **privados** (Financeiro + Estoque) só para `Luca, João, Luhan, Ronaldo`.
Uso diário, desktop primário + mobile no chão de operação. Login por nome + senha
compartilhada (`mrlion_user` em localStorage). É uma ferramenta de trabalho: a
interface deve **desaparecer na tarefa** — familiaridade é feature, não defeito.

## Superfícies (rotas)
| Rota | Tela | Função |
|---|---|---|
| `/` | Login | Seleção de membro + senha |
| `/overview` | Visão Geral | Dashboard de KPIs/métricas (landing pós-login) |
| `/assistente` | Assistente | Chat IA (Workers AI) |
| `/tasks` | Tarefas | Kanban + lista, drag-drop, side-panel |
| `/calendar` | Calendário | Reuniões + conteúdo unificados |
| `/campaigns` | Campanhas | Gestão de campanhas (form modal + side-panel) |
| `/revendedores` | CRM | Pipeline de leads/revendedores |
| `/financeiro` | Financeiro · Comando | DRE editável (receita/custo/lucro) — **gated** |
| `/financeiro/lucro` | Financeiro · Lucro | Margens por produto + atribuição — **gated** |
| `/financeiro/caixa` | Financeiro · Caixa | Fluxo de caixa — **gated** |
| `/estoque` | Estoque | Dashboard/Estoque/Compras/Movimentações/Produção/Relatórios (seções in-app) — **gated** |

## Config viva
- **Prod**: https://mrlionhub.com.br — Cloudflare Pages, projeto `mrlionhub`, branch `main`.
- **Deploy** (MANUAL, nunca automático): `npx wrangler pages deploy dist --project-name mrlionhub --branch main --commit-dirty=true`. `git push` NÃO deploya.
- **Dev**: `npm run dev` → http://localhost:8080
- **Build**: `npm run build` (Vite → `dist/`) · **Lint**: `npm run lint` · **Test**: `npm run test` (vitest)
- **Screenshots QA**: `python3 .design-preview/shoot.py --out DIR` (loga como Luca, light+dark, desktop+mobile)

## Stack
React 18 + TS + Vite (SWC) · Tailwind 3 + shadcn/ui (Radix) · zustand+persist · TanStack Query ·
react-router 6 · framer-motion · recharts · @dnd-kit · lucide-react · Montserrat.

## register
product
