import { Task, Activity, Meeting, Revendedor, BusinessKPIs, APP_PASSWORD, ROLES_KEY, RevendedorCanal, ProximaAcao, Interacao, VolumeHistorico } from "./types";

const TASKS_KEY = "mrlion_tasks_v3";
const ACTIVITY_KEY = "mrlion_activity_v3";
const MEETINGS_KEY = "mrlion_meetings_v3";
const CRM_KEY = "crm_revendedores";
const KPI_KEY = "business_kpis";
const USER_KEY = "mrlion_user";
const NEXT_ID_KEY = "mrlion_next_id_v3";
const PRESENCE_KEY = "mrlion_presence";

function getNextId(): number {
  const current = parseInt(localStorage.getItem(NEXT_ID_KEY) || "31000");
  localStorage.setItem(NEXT_ID_KEY, String(current + 1));
  return current;
}

function now() { return new Date().toISOString(); }

const SEED_TASKS: Task[] = [
  { id: 30005, title: "Configurar Delivery Direto (PDV, gestão de pedidos, estoque)", detail: "", responsible: ["Luca"], priority: "alta", area: "Operacional", status: "pendente", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luca", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30006, title: "Verificar integração Nuvemshop com ponto de venda/retirada", detail: "", responsible: ["Luca"], priority: "media", area: "Operacional", status: "pendente", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luca", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30007, title: "Cadastrar Mercado Livre + Amazon", detail: "", responsible: ["Luca"], priority: "media", area: "Comercial", status: "pendente", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luca", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30008, title: "Mandar scripts para Guilherme (Bot SDR)", detail: "", responsible: ["Luca"], priority: "alta", area: "Marketing", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luca", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30009, title: "Enviar direcional de quantidade de fotos para Luhan", detail: "", responsible: ["Luca"], priority: "media", area: "Conteúdo", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luca", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30010, title: "Chamar Pedro individualmente para alinhar diagnóstico comercial", detail: "", responsible: ["Luca"], priority: "alta", area: "Comercial", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luca", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30011, title: "Mandar ideias de sabores RTD para João por escrito", detail: "", responsible: ["Luca"], priority: "media", area: "Produto", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luca", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30039, title: "Testar bot de suporte Nuvemshop", detail: "", responsible: ["Luca"], priority: "media", area: "Operacional", status: "pendente", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luca", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30040, title: "Testar integração Bling + Nuvemshop", detail: "", responsible: ["Luca"], priority: "alta", area: "Operacional", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luca", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30041, title: "Avaliar questão dos kits/combos na Nuvemshop", detail: "", responsible: ["Luca"], priority: "media", area: "Comercial", status: "pendente", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luca", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30042, title: "Configurar domínio Nuvemshop", detail: "", responsible: ["Luca"], priority: "alta", area: "Operacional", status: "pendente", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luca", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30043, title: "Kit Carnaval — 3 garrafas a R$299", detail: "", responsible: ["Luca", "João"], priority: "alta", area: "Marketing", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luca", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30044, title: "Criativos e Stories de Carnaval", detail: "", responsible: ["Luca"], priority: "alta", area: "Conteúdo", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luca", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30049, title: "Enviar apresentação da marca no grupo", detail: "", responsible: ["Luca"], priority: "baixa", area: "Comercial", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luca", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30056, title: "Confirmar cobrança por mensagem no HighLevel", detail: "", responsible: ["Luca"], priority: "media", area: "Operacional", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luca", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30061, title: "Atualizar documento Kit PDV com novas ideias", detail: "", responsible: ["Luca", "Guilherme"], priority: "alta", area: "Comercial", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luca", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30063, title: "Garrafa nova + Rebranding", detail: "", responsible: ["Luca"], priority: "alta", area: "Produto", status: "pendente", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luca", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30069, title: "Compartilhar link do painel de reunião no grupo", detail: "", responsible: ["Luca"], priority: "baixa", area: "Operacional", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luca", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30070, title: "Avaliar funil de leads na Nuvemshop", detail: "", responsible: ["Luca"], priority: "alta", area: "Marketing", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luca", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30071, title: "Testar integração Melhor Envio / Nuvem Envio", detail: "", responsible: ["Luca"], priority: "alta", area: "Operacional", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luca", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30074, title: "Testar cálculo de frete para múltiplas unidades", detail: "", responsible: ["Luca"], priority: "media", area: "Operacional", status: "pendente", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luca", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30012, title: "Pesquisar composição do drink 'of Miami'", detail: "", responsible: ["Guilherme"], priority: "media", area: "Produto", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Guilherme", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30031, title: "Desenvolver documento Kit PDV (PDV físico por nível + Benefícios)", detail: "", responsible: ["Guilherme"], priority: "alta", area: "Comercial", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Guilherme", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30032, title: "Mandar documento Kit PDV no grupo", detail: "", responsible: ["Guilherme"], priority: "alta", area: "Comercial", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Guilherme", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30033, title: "Mandar ideias de sabores RTD para João por escrito", detail: "", responsible: ["Guilherme"], priority: "media", area: "Produto", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Guilherme", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30034, title: "Definição da comunicação do lançamento Delivery — com Luca", detail: "", responsible: ["Guilherme"], priority: "alta", area: "Marketing", status: "pendente", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Guilherme", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30064, title: "RTD — Definir sabor e começar composição", detail: "", responsible: ["Guilherme", "João"], priority: "alta", area: "Produto", status: "em-andamento", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Guilherme", isOriginal: true, createdAt: now(), updatedAt: now(), attachments: [{ name: "Documento de Composição RTD", data: "", type: "link", label: "Documento de Composição RTD", url: "https://docs.google.com/document/d/10XDIDHsZHkdC_Vnqs3AbZ-a65eDN1ftaN2GEr7GG7yI/edit?tab=t.0" }] },
  { id: 30072, title: "Planejar ação presencial RTD na Copa", detail: "", responsible: ["Guilherme", "João"], priority: "media", area: "Marketing", status: "pendente", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Guilherme", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30013, title: "Repassar dados para Luca (Nuvem Pago)", detail: "", responsible: ["João"], priority: "alta", area: "Operacional", status: "pendente", dependencies: [], decision: null, notes: "Aguardando abertura CNPJ", dueDate: null, createdBy: "João", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30014, title: "Assinar Delivery Direto", detail: "", responsible: ["João"], priority: "alta", area: "Operacional", status: "pendente", dependencies: [], decision: null, notes: "Aguardando abertura CNPJ", dueDate: null, createdBy: "João", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30015, title: "Reavaliar estrutura delivery (contratar alguém ou não)", detail: "", responsible: ["João"], priority: "alta", area: "Operacional", status: "concluida", dependencies: [], decision: null, notes: "Análise para Contratação – Suporte de Delivery\n\nHorário de Trabalho:\nSexta-feira: 17h às 22h\nSábado: 12h às 22h\nDomingo: 12h às 19h\n\nSalário: R$ 1.500,00\n\nPrincipais Responsabilidades:\n- Atendimento e suporte aos clientes durante o delivery\n- Gestão dos motoboys (Uber Flash / Lalamove)\n- Organização e acompanhamento dos pedidos\n- Comunicação com a gerente da Degusto para informar e alinhar os pedidos", dueDate: null, createdBy: "João", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30016, title: "Reunião Vinícius — 20/02 às 15h", detail: "", responsible: ["João"], priority: "alta", area: "Comercial", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "João", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30017, title: "Fazer amostras RTD — aguardar ideias de sabores", detail: "", responsible: ["João"], priority: "alta", area: "Produto", status: "em-andamento", dependencies: [], decision: null, notes: "Vou preparando algumas amostras e depois fazemos os testes, recebi já algumas ideias, assim que tiver coisa pronta mando para vcs", dueDate: null, createdBy: "João", isOriginal: true, createdAt: now(), updatedAt: now(), attachments: [{ name: "Documento de Composição RTD", data: "", type: "link", label: "Documento de Composição RTD", url: "https://docs.google.com/document/d/10XDIDHsZHkdC_Vnqs3AbZ-a65eDN1ftaN2GEr7GG7yI/edit?tab=t.0" }] },
  { id: 30019, title: "Identificar 1 pessoa de confiança para piloto do Nation", detail: "", responsible: ["João"], priority: "alta", area: "Comercial", status: "concluida", dependencies: [], decision: null, notes: "Guiba parceiro meu vai ser esse 'cobaia', vamos preparar o curso e ele vai avaliar antes de rodar aberto para o público", dueDate: null, createdBy: "João", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30037, title: "Avaliar gateways de pagamento", detail: "", responsible: ["João"], priority: "alta", area: "Operacional", status: "concluida", dependencies: [], decision: null, notes: "Nuvem Pago", dueDate: null, createdBy: "João", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30038, title: "Resolver questão do CNPJ", detail: "", responsible: ["João", "Luhan"], priority: "alta", area: "Operacional", status: "em-andamento", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "João", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30045, title: "Enviar press-kits para o Rio", detail: "", responsible: ["João"], priority: "alta", area: "Marketing", status: "atrasada", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "João", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30047, title: "Enviar amostras para Orochi", detail: "", responsible: ["João"], priority: "alta", area: "Comercial", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "João", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30051, title: "Estruturar programa Mr. Lion Nation (treinamento)", detail: "", responsible: ["João"], priority: "alta", area: "Comercial", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "João", isOriginal: true, createdAt: now(), updatedAt: now(), attachments: [{ name: "Documento Mr. Lion Nation", data: "", type: "link", label: "Documento Mr. Lion Nation", url: "https://docs.google.com/document/d/1M5vIP1GRVGw_2xrao1bn63-TDO5i5a0fLYHl0OpG0GA/edit?tab=t.0" }] },
  { id: 30052, title: "Definir premiações e ranking do Nation", detail: "", responsible: ["João"], priority: "alta", area: "Comercial", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "João", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30057, title: "Trocar ideia com contato do João (bot SDR)", detail: "", responsible: ["João"], priority: "media", area: "Marketing", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "João", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30065, title: "RTD — Enviar amostras para MD", detail: "", responsible: ["João"], priority: "alta", area: "Produto", status: "pendente", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "João", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30067, title: "Pesquisar fornecedor de copos", detail: "", responsible: ["João"], priority: "media", area: "Produto", status: "pendente", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "João", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30068, title: "Pesquisar garrafa 375ml e kit de 3", detail: "", responsible: ["João"], priority: "alta", area: "Produto", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "João", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30021, title: "Café com Ângelo (Degusto): logística delivery Rio, estoque, app", detail: "", responsible: ["Luhan"], priority: "alta", area: "Operacional", status: "pendente", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luhan", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30023, title: "Reunião Vinícius — 20/02 às 15h", detail: "", responsible: ["Luhan"], priority: "alta", area: "Comercial", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luhan", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30024, title: "Sondar Tóia para ação Dia da Mulher (8/03)", detail: "", responsible: ["Luhan"], priority: "media", area: "Marketing", status: "pendente", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luhan", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30025, title: "Marcar reunião com Orochi quando amostras chegarem", detail: "", responsible: ["Luhan"], priority: "alta", area: "Comercial", status: "pendente", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luhan", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30026, title: "Mandar ideias de sabores RTD para João por escrito", detail: "", responsible: ["Luhan"], priority: "media", area: "Produto", status: "pendente", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luhan", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30046, title: "Imprimir material gráfico no Rio", detail: "", responsible: ["Luhan"], priority: "media", area: "Marketing", status: "pendente", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luhan", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30053, title: "Estratégia de aproximação Carlos Prates", detail: "", responsible: ["Luhan"], priority: "alta", area: "Comercial", status: "pendente", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luhan", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30058, title: "Marcar reunião com Vinícius (processos)", detail: "", responsible: ["Luhan"], priority: "alta", area: "Operacional", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luhan", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30066, title: "Orçamento de ensaio fotográfico no Rio", detail: "", responsible: ["Luhan"], priority: "media", area: "Conteúdo", status: "pendente", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Luhan", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30027, title: "Fazer documento de diagnóstico comercial", detail: "", responsible: ["Pedro"], priority: "alta", area: "Comercial", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Pedro", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30028, title: "Exportar histórico de conversas de qualificação do WhatsApp", detail: "", responsible: ["Pedro"], priority: "alta", area: "Comercial", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Pedro", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30029, title: "Reunião individual com Luca", detail: "", responsible: ["Pedro"], priority: "alta", area: "Comercial", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Pedro", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30030, title: "Mandar ideias de sabores RTD para João por escrito", detail: "", responsible: ["Pedro"], priority: "media", area: "Produto", status: "pendente", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Pedro", isOriginal: true, createdAt: now(), updatedAt: now() },
  { id: 30060, title: "Mensagem padrão de pré-cadastro PJ", detail: "", responsible: ["Pedro"], priority: "alta", area: "Comercial", status: "concluida", dependencies: [], decision: null, notes: "", dueDate: null, createdBy: "Pedro", isOriginal: true, createdAt: now(), updatedAt: now() },
];

function genVolHist(base: number): VolumeHistorico[] {
  const months = ["2025-09","2025-10","2025-11","2025-12","2026-01","2026-02"];
  return months.map(m => ({ mes: m, volume: Math.round(base * (0.8 + Math.random() * 0.4)) }));
}

function calcScore(r: Partial<Revendedor>): number {
  let s = 0;
  if ((r.volume || 0) >= 300) s += 40;
  else if ((r.volume || 0) >= 100) s += 25;
  else s += 10;
  if (r.status === "Ativo" || r.status === "Recorrente") s += 30;
  const days = r.ultima ? Math.floor((Date.now() - new Date(r.ultima).getTime()) / 86400000) : 999;
  if (days <= 7) s += 20;
  else if (days <= 30) s += 10;
  if (r.proximaAcao) s += 10;
  return Math.min(s, 100);
}

export { calcScore };

const SEED_REVENDEDORES: Revendedor[] = [
  { id: "r1", nome: "Distribuidora São Paulo Centro", responsavel: "João", status: "Ativo", canal: "WhatsApp", cidade: "São Paulo", volume: 320, ultima: "2026-02-20", obs: "Principal distribuidor da zona central", whatsapp: "5511988881111", instagram: "@distspcentro", email: "contato@distspcentro.com.br", telefone: "(11) 3333-1111", tags: ["alta prioridade", "atacado"], score: 0, proximaAcao: { data: "2026-02-28", descricao: "Enviar proposta de março com desconto volume" }, volumeHistorico: genVolHist(320), historico: [
    { id: "h1", data: "2026-02-20", tipo: "WhatsApp", descricao: "Confirmou pedido de 320 garrafas para fevereiro", autor: "João" },
    { id: "h2", data: "2026-02-10", tipo: "Reunião", descricao: "Reunião presencial para alinhar logística de entrega", autor: "João" },
    { id: "h3", data: "2026-01-28", tipo: "Email", descricao: "Enviado catálogo atualizado com novos produtos", autor: "João" },
  ]},
  { id: "r2", nome: "Revenda Norte Shopping", responsavel: "Luca", status: "Ativo", canal: "Instagram", cidade: "São Paulo", volume: 180, ultima: "2026-02-18", obs: "", whatsapp: "5511977772222", instagram: "@revendanorte", email: "vendas@revendanorte.com", telefone: "(11) 4444-2222", tags: ["shopping", "varejo"], score: 0, proximaAcao: null, volumeHistorico: genVolHist(180), historico: [
    { id: "h4", data: "2026-02-18", tipo: "WhatsApp", descricao: "Enviou foto da vitrine com produtos Mr. Lion", autor: "Luca" },
    { id: "h5", data: "2026-02-05", tipo: "Visita", descricao: "Visita para reposição de estoque", autor: "Luca" },
  ]},
  { id: "r3", nome: "Bar do Alemão", responsavel: "Pedro", status: "Em Negociação", canal: "Indicação", cidade: "Campinas", volume: 90, ultima: "2026-02-15", obs: "Indicação do Vinícius. Interesse em ser PDV exclusivo em Campinas.", whatsapp: "5519966663333", instagram: "@bardoalemao", email: "", telefone: "(19) 3322-3333", tags: ["bar", "interior"], score: 0, proximaAcao: { data: "2026-02-27", descricao: "Agendar degustação presencial no bar" }, volumeHistorico: genVolHist(90), historico: [
    { id: "h6", data: "2026-02-15", tipo: "Ligação", descricao: "Ligação para apresentar condições comerciais", autor: "Pedro" },
    { id: "h7", data: "2026-02-08", tipo: "WhatsApp", descricao: "Primeiro contato via indicação", autor: "Pedro" },
  ]},
  { id: "r4", nome: "Empório Vila Madalena", responsavel: "João", status: "Ativo", canal: "Instagram", cidade: "São Paulo", volume: 240, ultima: "2026-02-22", obs: "", whatsapp: "5511955554444", instagram: "@emporiovilamada", email: "compras@emporiovm.com.br", telefone: "(11) 3456-4444", tags: ["empório", "premium"], score: 0, proximaAcao: { data: "2026-03-01", descricao: "Negociar espaço para display exclusivo" }, volumeHistorico: genVolHist(240), historico: [
    { id: "h8", data: "2026-02-22", tipo: "Visita", descricao: "Entrega de material PDV atualizado", autor: "João" },
    { id: "h9", data: "2026-02-12", tipo: "WhatsApp", descricao: "Pedido mensal confirmado", autor: "João" },
  ]},
  { id: "r5", nome: "Distribuidora ABC", responsavel: "Guilherme", status: "Inativo", canal: "WhatsApp", cidade: "Santo André", volume: 60, ultima: "2026-01-30", obs: "Parou de comprar por questões financeiras. Reavaliar em março.", whatsapp: "5511944445555", instagram: "", email: "dist.abc@gmail.com", telefone: "(11) 4455-5555", tags: ["inativo"], score: 0, proximaAcao: null, volumeHistorico: genVolHist(60), historico: [
    { id: "h10", data: "2026-01-30", tipo: "Ligação", descricao: "Tentativa de reativação — sem sucesso", autor: "Guilherme" },
  ]},
  { id: "r6", nome: "Mercado do Bairro Pinheiros", responsavel: "Luhan", status: "Novo Lead", canal: "Instagram", cidade: "São Paulo", volume: 0, ultima: "2026-02-23", obs: "Encontrado via Instagram, demonstrou interesse no DM", whatsapp: "5511933336666", instagram: "@mercadopinheiros", email: "mercadopinheiros@gmail.com", telefone: "", tags: ["lead quente"], score: 0, proximaAcao: { data: "2026-02-25", descricao: "Enviar catálogo e condições iniciais" }, volumeHistorico: genVolHist(0), historico: [
    { id: "h11", data: "2026-02-23", tipo: "WhatsApp", descricao: "Primeiro contato — enviou apresentação da marca", autor: "Luhan" },
  ]},
  { id: "r7", nome: "Club 23", responsavel: "Pedro", status: "Ativo", canal: "Indicação", cidade: "São Paulo", volume: 150, ultima: "2026-02-19", obs: "", whatsapp: "5511922227777", instagram: "@club23sp", email: "contato@club23.com.br", telefone: "(11) 3210-7777", tags: ["bar", "noturno"], score: 0, proximaAcao: null, volumeHistorico: genVolHist(150), historico: [
    { id: "h12", data: "2026-02-19", tipo: "Reunião", descricao: "Reunião para alinhar próximos eventos com a marca", autor: "Pedro" },
    { id: "h13", data: "2026-02-01", tipo: "WhatsApp", descricao: "Confirmação de pedido mensal", autor: "Pedro" },
  ]},
  { id: "r8", nome: "Loja Virtual Premium", responsavel: "Luca", status: "Em Negociação", canal: "Outros", cidade: "Online", volume: 500, ultima: "2026-02-21", obs: "Marketplace premium. Potencial enorme se fechar exclusividade online.", whatsapp: "5511911118888", instagram: "@lojavirtualpremium", email: "parceiros@lvpremium.com.br", telefone: "(11) 3000-8888", tags: ["e-commerce", "alta prioridade", "marketplace"], score: 0, proximaAcao: { data: "2026-02-26", descricao: "Enviar contrato de exclusividade para análise jurídica" }, volumeHistorico: genVolHist(500), historico: [
    { id: "h14", data: "2026-02-21", tipo: "Email", descricao: "Enviado termos comerciais e proposta de exclusividade", autor: "Luca" },
    { id: "h15", data: "2026-02-14", tipo: "Reunião", descricao: "Call para apresentação da marca e linha de produtos", autor: "Luca" },
    { id: "h16", data: "2026-02-07", tipo: "WhatsApp", descricao: "Primeiro contato — interesse vindo do site", autor: "Luca" },
  ]},
];

// Calculate scores for seed data
SEED_REVENDEDORES.forEach(r => { r.score = calcScore(r); });

const SEED_MEETINGS: Meeting[] = [
  { id: 9001, title: "Daily Mr. Lion", meetingDate: "2026-02-24", fileType: "pauta", fileName: "", fileUrl: "", uploadedBy: "Luca", notes: "Alinhamento diário de tarefas e pendências da operação", createdAt: now(), hora: "09:30", tipo: "Recorrente", participantes: ["Luca", "João", "Luhan", "Pedro", "Guilherme"], local: "Google Meet", meetingStatus: "Agendada" },
  { id: 9002, title: "Review de Distribuição — Fevereiro", meetingDate: "2026-02-25", fileType: "resumo", fileName: "", fileUrl: "", uploadedBy: "Luca", notes: "Análise de volume por revendedor, metas de março, ações de ativação", createdAt: now(), hora: "14:00", tipo: "Mensal", participantes: ["Luca", "João", "Pedro"], local: "Escritório SP", meetingStatus: "Agendada" },
  { id: 9003, title: "Briefing Campanha Março", meetingDate: "2026-02-26", fileType: "pauta", fileName: "", fileUrl: "", uploadedBy: "Luca", notes: "Definição de criativo, peças e cronograma de conteúdo para março", createdAt: now(), hora: "11:00", tipo: "Pontual", participantes: ["Luca", "Luhan", "Guilherme"], local: "Google Meet", meetingStatus: "Agendada" },
];

function initIfNeeded() {
  if (!localStorage.getItem(TASKS_KEY)) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(SEED_TASKS));
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify([]));
    localStorage.setItem(NEXT_ID_KEY, "31000");
  }
  if (!localStorage.getItem(MEETINGS_KEY)) {
    localStorage.setItem(MEETINGS_KEY, JSON.stringify(SEED_MEETINGS));
  } else {
    // Migrate meetings to add new fields
    try {
      const existing: any[] = JSON.parse(localStorage.getItem(MEETINGS_KEY) || "[]");
      let migrated = false;
      existing.forEach((m: any) => {
        if (!("hora" in m)) { m.hora = ""; migrated = true; }
        if (!("tipo" in m)) { m.tipo = "Pontual"; migrated = true; }
        if (!("participantes" in m)) { m.participantes = []; migrated = true; }
        if (!("local" in m)) { m.local = ""; migrated = true; }
        if (!("meetingStatus" in m)) { m.meetingStatus = "Agendada"; migrated = true; }
      });
      if (migrated) localStorage.setItem(MEETINGS_KEY, JSON.stringify(existing));
    } catch {}
  }
  if (!localStorage.getItem(CRM_KEY)) {
    localStorage.setItem(CRM_KEY, JSON.stringify(SEED_REVENDEDORES));
  } else {
    // Migrate existing revendedores to add new fields
    try {
      const existing: any[] = JSON.parse(localStorage.getItem(CRM_KEY) || "[]");
      let migrated = false;
      existing.forEach((r: any) => {
        if (!("whatsapp" in r)) { r.whatsapp = ""; migrated = true; }
        if (!("instagram" in r)) { r.instagram = ""; migrated = true; }
        if (!("email" in r)) { r.email = ""; migrated = true; }
        if (!("telefone" in r)) { r.telefone = ""; migrated = true; }
        if (!("tags" in r)) { r.tags = []; migrated = true; }
        if (!("score" in r)) { r.score = calcScore(r); migrated = true; }
        if (!("proximaAcao" in r)) { r.proximaAcao = null; migrated = true; }
        if (!("volumeHistorico" in r)) { r.volumeHistorico = genVolHist(r.volume || 0); migrated = true; }
        if (!("historico" in r)) { r.historico = []; migrated = true; }
      });
      if (migrated) localStorage.setItem(CRM_KEY, JSON.stringify(existing));
    } catch {}
  }
}

// Password
export function validatePassword(password: string): boolean {
  return password === APP_PASSWORD;
}

// User
export function getUser(): string | null { return localStorage.getItem(USER_KEY); }
export function setUser(name: string) { localStorage.setItem(USER_KEY, name); updatePresence(name); }
export function clearUser() { const user = getUser(); if (user) removePresence(user); localStorage.removeItem(USER_KEY); }

// Roles
export function getRole(name: string): string {
  const raw = localStorage.getItem(ROLES_KEY);
  const roles: Record<string, string> = raw ? JSON.parse(raw) : {};
  return roles[name] || "";
}
export function setRole(name: string, role: string) {
  const raw = localStorage.getItem(ROLES_KEY);
  const roles: Record<string, string> = raw ? JSON.parse(raw) : {};
  roles[name] = role;
  localStorage.setItem(ROLES_KEY, JSON.stringify(roles));
}

// Presence
interface PresenceEntry { name: string; lastSeen: number; }
export function getOnlineUsers(): string[] {
  const raw = localStorage.getItem(PRESENCE_KEY);
  if (!raw) return [];
  const entries: PresenceEntry[] = JSON.parse(raw);
  const n = Date.now();
  return entries.filter(e => n - e.lastSeen < 120000).map(e => e.name);
}
export function updatePresence(name: string) {
  const raw = localStorage.getItem(PRESENCE_KEY);
  let entries: PresenceEntry[] = raw ? JSON.parse(raw) : [];
  entries = entries.filter(e => e.name !== name);
  entries.push({ name, lastSeen: Date.now() });
  localStorage.setItem(PRESENCE_KEY, JSON.stringify(entries));
}
function removePresence(name: string) {
  const raw = localStorage.getItem(PRESENCE_KEY);
  if (!raw) return;
  let entries: PresenceEntry[] = JSON.parse(raw);
  entries = entries.filter(e => e.name !== name);
  localStorage.setItem(PRESENCE_KEY, JSON.stringify(entries));
}

// Tasks
export function getTasks(): Task[] { initIfNeeded(); return JSON.parse(localStorage.getItem(TASKS_KEY) || "[]"); }
export function getTaskById(id: number): Task | undefined { return getTasks().find(t => t.id === id); }
export function createTask(data: Omit<Task, "id" | "createdAt" | "updatedAt">): Task {
  const tasks = getTasks();
  const task: Task = { ...data, id: getNextId(), createdAt: now(), updatedAt: now() };
  tasks.push(task);
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  return task;
}
export function updateTask(id: number, updates: Partial<Task>): Task | undefined {
  const tasks = getTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return undefined;
  tasks[idx] = { ...tasks[idx], ...updates, updatedAt: now() };
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  return tasks[idx];
}
export function deleteTask(id: number): boolean {
  const tasks = getTasks();
  const filtered = tasks.filter(t => t.id !== id);
  if (filtered.length === tasks.length) return false;
  localStorage.setItem(TASKS_KEY, JSON.stringify(filtered));
  return true;
}

// Activity
export function getActivities(): Activity[] { initIfNeeded(); return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]"); }
export function logActivity(data: Omit<Activity, "id" | "createdAt">) {
  const activities = getActivities();
  const activity: Activity = { ...data, id: getNextId(), createdAt: now() };
  activities.unshift(activity);
  if (activities.length > 200) activities.length = 200;
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities));
}

// Meetings
export function getMeetings(): Meeting[] { initIfNeeded(); return JSON.parse(localStorage.getItem(MEETINGS_KEY) || "[]"); }
export function createMeeting(data: Omit<Meeting, "id" | "createdAt">): Meeting {
  const meetings = getMeetings();
  const meeting: Meeting = { ...data, id: getNextId(), createdAt: now() };
  meetings.unshift(meeting);
  localStorage.setItem(MEETINGS_KEY, JSON.stringify(meetings));
  return meeting;
}
export function updateMeeting(id: number, updates: Partial<Meeting>): Meeting | undefined {
  const meetings = getMeetings();
  const idx = meetings.findIndex(m => m.id === id);
  if (idx === -1) return undefined;
  meetings[idx] = { ...meetings[idx], ...updates };
  localStorage.setItem(MEETINGS_KEY, JSON.stringify(meetings));
  return meetings[idx];
}
export function deleteMeeting(id: number): boolean {
  const meetings = getMeetings();
  const filtered = meetings.filter(m => m.id !== id);
  if (filtered.length === meetings.length) return false;
  localStorage.setItem(MEETINGS_KEY, JSON.stringify(filtered));
  return true;
}

// CRM
export function getRevendedores(): Revendedor[] { initIfNeeded(); return JSON.parse(localStorage.getItem(CRM_KEY) || "[]"); }
export function createRevendedor(data: Omit<Revendedor, "id">): Revendedor {
  const revs = getRevendedores();
  const rev: Revendedor = { ...data, id: `r${Date.now()}` };
  revs.push(rev);
  localStorage.setItem(CRM_KEY, JSON.stringify(revs));
  return rev;
}
export function updateRevendedor(id: string, updates: Partial<Revendedor>): Revendedor | undefined {
  const revs = getRevendedores();
  const idx = revs.findIndex(r => r.id === id);
  if (idx === -1) return undefined;
  revs[idx] = { ...revs[idx], ...updates };
  localStorage.setItem(CRM_KEY, JSON.stringify(revs));
  return revs[idx];
}
export function deleteRevendedor(id: string): boolean {
  const revs = getRevendedores();
  const filtered = revs.filter(r => r.id !== id);
  if (filtered.length === revs.length) return false;
  localStorage.setItem(CRM_KEY, JSON.stringify(filtered));
  return true;
}

// Business KPIs
const DEFAULT_KPIS: BusinessKPIs = { metaMensal: 1600, realizado: 619, receitaEstimada: 95175, ticketMedio: 213, custoEntrega: 18.17 };
const KPI_VERSION = "kpi_v2";
function migrateKPIs() {
  if (!localStorage.getItem(KPI_VERSION)) {
    localStorage.setItem(KPI_KEY, JSON.stringify(DEFAULT_KPIS));
    localStorage.setItem(KPI_VERSION, "1");
  }
}
export function getBusinessKPIs(): BusinessKPIs {
  migrateKPIs();
  const raw = localStorage.getItem(KPI_KEY);
  return raw ? JSON.parse(raw) : DEFAULT_KPIS;
}
export function setBusinessKPIs(kpis: BusinessKPIs) {
  localStorage.setItem(KPI_KEY, JSON.stringify(kpis));
}

// Export
export function exportTasksMarkdown(): string {
  const tasks = getTasks();
  const statusEmoji: Record<string, string> = { pendente: "⏳", "em-andamento": "🔄", concluida: "✅", atrasada: "🚨" };
  let md = "# MR. LION — Tarefas\n\n";
  tasks.forEach(t => {
    md += `${statusEmoji[t.status] || "•"} **#${t.id} ${t.title}**\n`;
    md += `  Área: ${t.area} | Prioridade: ${t.priority} | Responsáveis: ${t.responsible.join(", ")}\n`;
    if (t.notes) md += `  Notas: ${t.notes}\n`;
    md += "\n";
  });
  return md;
}
