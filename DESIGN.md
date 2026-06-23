# DESIGN.md — Mr. Lion Hub · Sistema "Sóbrio Premium"

> Contrato de design único. **Todo agente de polish lê este arquivo e bate cada tela contra ele.**
> A linguagem já está APROVADA pelo Luca (memory `feedback-design-sobrio-premium`). Não redefina —
> **propague com consistência absoluta, feche lacunas funcionais, e polir cada pixel ao teto.**
> Register: **product** (familiaridade é virtude; a ferramenta some na tarefa).

---

## 1. Princípio
Neutro primeiro (preto/branco/cinza). **UM** acento = dourado de marca profundo e discreto.
Status colors dessaturados. **Sem glow, sem gradiente chamativo, sem pill arredondado exagerado.**
Tipografia Montserrat. Números sempre tabulares. Cantos retos-elegantes (6–8px). Sombras sutis.

## 2. Tokens (fonte da verdade = `src/index.css`) — use SEMPRE o token, NUNCA hex hardcoded
- **Fundo/superfície**: `bg-background` (#FAFAF9 / dark #0B0B0A) · `bg-card` (#FFF / #161513) · `bg-secondary`/`bg-muted` (inset).
- **Texto**: `text-foreground` (corpo) · `text-muted-foreground` (secundário) · `text-muted-foreground-dim` (terciário). Nunca cinza-claro p/ corpo.
- **Acento**: `text-gold` / `bg-gold` / `border-gold` (#8A6A1E light · #B8943F dark). Acento = ação primária, seleção, indicador. **Não** decoração.
- **CTA primário**: `.bg-cta` (quase-preto invertido) — sólido, sem cor/gradiente. Botão dourado sólido só onde já existe (login "Entrar").
- **Status** (sempre tinta dessaturada `bg-X/10 text-X border-X/30`): `success` verde-musgo · `danger` tijolo · `warning` âmbar-fosco · `info` azul-ardósia. Helpers prontos: `.status-*`, `.priority-*`.
- **Bordas/raios**: `border-border` · `rounded-card` (8) `rounded-sub` (6) `rounded-btn` (6).
- **Sombra**: `.shadow-soft` (sm) `.shadow-elevated` (md). Nada mais pesado.
- **Números**: classe `.tnum` OBRIGATÓRIA em todo valor numérico (R$, %, contagem, data).
- **Wordmark**: `.font-display` (Montserrat 700 uppercase tracking .08em).

## 3. Tipografia (product register)
- **Uma família** (Montserrat) carrega tudo. Escala rem FIXA (não fluida/clamp em UI). Ratio 1.125–1.2 entre steps.
- Hierarquia por **peso + tamanho**, não por cor. Pesos disponíveis: 300/400/500/600/700.
- Corpo de prosa 65–75ch; tabela/densidade pode passar. Sem ALL-CAPS em corpo (só labels ≤4 palavras / kicker / badge).
- Contraste mínimo: corpo ≥4.5:1, texto grande ≥3:1, placeholder ≥4.5:1. Na dúvida, escurece pro lado do `foreground`.

## 4. Matriz de estados (todo componente interativo entrega TODOS)
`default · hover · focus-visible · active · disabled · loading · error/selected`.
- **focus-visible**: anel `ring`/gold visível por teclado (a11y) — nunca remover outline sem substituto.
- **disabled**: opacidade + `cursor-not-allowed`, sem cor saturada.
- **loading**: **skeleton** (não spinner no meio do conteúdo) para listas/cards/tabelas; botão em ação → spinner inline + label.
- Vocabulário consistente: mesmo botão = mesma forma em toda tela. Mesmo input. Mesmo ícone-style (lucide).

## 5. Estados de dados (todo container de dados entrega os 3)
1. **Loading** → skeleton no shape do conteúdo.
2. **Empty** → estado que ENSINA ("Nenhuma campanha ainda — crie a primeira" + CTA), nunca "nada aqui".
3. **Error** → mensagem clara + ação de retry. Nunca tela branca/crash.

## 6. Layout & responsivo
- Desktop primário (sidebar 240px fixa) + mobile (drawer). Responsivo é ESTRUTURAL (colapsa sidebar, tabela vira cards/scroll), não tipografia fluida.
- Grid responsivo sem breakpoint: `repeat(auto-fit, minmax(280px, 1fr))`. Flex p/ 1D, Grid p/ 2D.
- Ritmo de espaçamento variado (não tudo no mesmo gap). Conteúdo `max-w-[1400px]` centralizado (já no AppLayout).
- z-index semântico: dropdown < sticky < modal-backdrop < modal < toast < tooltip. Nada de 9999.
- Dropdown/popover dentro de `overflow:hidden` → usar Radix portal (já é o padrão shadcn). Não clipar.

## 7. Motion (product: 150–250ms, transmite estado, não decora)
- Transições 150–250ms, ease-out. Entrada de página: o fade-y curto já existente (`framer-motion` no AppLayout) — manter, não orquestrar sequências longas.
- Stagger só em lista (entrada de itens). `prefers-reduced-motion: reduce` → crossfade/instantâneo OBRIGATÓRIO.
- Recharts: animação sutil, sem bounce.

## 8. Copy
- PT-BR. Verbo+objeto em botões ("Salvar alterações", não "OK"). Link com sentido standalone.
- **Sem em-dash (—) no texto de UI.** Sem buzzword (otimizar/turbinar/transformar/seamless). Específico, não aforístico.

## 9. Bans absolutos (match-and-refuse — reescreve com outra estrutura)
- ❌ Side-stripe border (`border-left` colorido >1px em card/alerta). Use borda cheia / tinta de fundo / número-líder.
- ❌ Gradient text (`background-clip:text`). Cor sólida; ênfase por peso/tamanho.
- ❌ Glassmorphism decorativo. (backdrop-blur só onde já existe na topbar, funcional.)
- ❌ Hero-metric template genérico (número gigante + label + gradiente).
- ❌ Grids de cards idênticos infinitos / card aninhado em card.
- ❌ Eyebrow uppercase tracado acima de TODA seção / marcadores 01·02·03 por reflexo.
- ❌ Glow, neon, gradiente dourado chamativo, pill muito redondo. (este é o anti-padrão que o Luca rejeitou.)
- ❌ Texto que estoura o container em qualquer breakpoint. Teste o heading em desktop E mobile.

## 10. Checklist de polish por tela (o agente roda TODOS antes de declarar pronto)
1. **Token-puro**: zero hex/cor hardcoded; tudo via token. Funciona light E dark (testar os dois).
2. **Contraste**: corpo ≥4.5:1 nos dois temas. Sem cinza lavado.
3. **Estados**: todo botão/input/linha tem hover/focus-visible/active/disabled. Foco por teclado visível.
4. **Dados**: loading=skeleton, empty=ensina, error=retry. Nada de crash/branco.
5. **Responsivo**: desktop 1440 + mobile 390 sem overflow, sem corte, toque ≥40px.
6. **Densidade & ritmo**: alinhamento de grid, espaçamento intencional, `.tnum` em todo número.
7. **Hierarquia**: 1 título claro, peso>cor, nada compete com o acento.
8. **Motion**: 150–250ms, reduced-motion ok, sem decoração gratuita.
9. **Copy**: PT-BR, verbo+objeto, sem em-dash, sem buzzword.
10. **a11y**: `aria-label` em ícone-botão, `alt` em img, ordem de tab lógica, `<button>`/`<a>` semânticos.
11. **Funcional**: a ação faz o que diz (CRUD persiste, nav navega, filtro filtra). Sem console error/warning.
12. **Consistência cross-tela**: mesmo componente = mesmo visual do gold-standard e das outras telas.

## 11. Regra de ouro do escopo
Polir e endurecer DENTRO do sistema aprovado. Mudou cor de marca, fonte, ou virou colorido/glow?
→ Saiu do contrato. Reescreve. Em dúvida de direção visual subjetiva nova → para e pergunta ao Luca.
