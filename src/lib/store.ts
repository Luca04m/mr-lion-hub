import { Task, Activity, Meeting, Revendedor, BusinessKPIs, APP_PASSWORD, ROLES_KEY, RevendedorCanal, RevendedorStatus, ProximaAcao, Interacao, VolumeHistorico } from "./types";
import { supabase, isSupabaseEnabled } from "./supabase";

// ─── LocalStorage Keys (used as local cache) ───
const TASKS_KEY = "mrlion_tasks_v3";
const ACTIVITY_KEY = "mrlion_activity_v3";
const MEETINGS_KEY = "mrlion_meetings_v3";
const CRM_KEY = "crm_revendedores";
const KPI_KEY = "business_kpis";
const USER_KEY = "mrlion_user";
const NEXT_ID_KEY = "mrlion_next_id_v3";
const PRESENCE_KEY = "mrlion_presence";

// ─── Listeners for realtime updates ───
type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function notifyListeners() {
  listeners.forEach(fn => fn());
}

// ─── ID Generation ───
async function getNextIdAsync(): Promise<number> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase.rpc('get_next_id');
    if (!error && data) return data as number;
  }
  // Fallback to localStorage
  const current = parseInt(localStorage.getItem(NEXT_ID_KEY) || "31000");
  localStorage.setItem(NEXT_ID_KEY, String(current + 1));
  return current;
}

function getNextIdSync(): number {
  const current = parseInt(localStorage.getItem(NEXT_ID_KEY) || "31000");
  localStorage.setItem(NEXT_ID_KEY, String(current + 1));
  return current;
}

function now() { return new Date().toISOString(); }

// ─── Supabase Helpers ───

function taskToDb(t: Task): Record<string, unknown> {
  return {
    id: t.id,
    title: t.title,
    detail: t.detail,
    responsible: t.responsible,
    priority: t.priority,
    area: t.area,
    status: t.status,
    dependencies: t.dependencies,
    decision: t.decision,
    notes: t.notes,
    due_date: t.dueDate,
    created_by: t.createdBy,
    is_original: t.isOriginal,
    tags: t.tags || [],
    attachments: t.attachments || [],
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

function dbToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as number,
    title: row.title as string,
    detail: row.detail as string,
    responsible: row.responsible as string[],
    priority: row.priority as string as Task['priority'],
    area: row.area as string,
    status: row.status as string as Task['status'],
    dependencies: row.dependencies as number[],
    decision: row.decision as string | null,
    notes: row.notes as string,
    dueDate: row.due_date as string | null,
    createdBy: row.created_by as string,
    isOriginal: row.is_original as boolean,
    tags: row.tags as string[],
    attachments: row.attachments as Task['attachments'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function meetingToDb(m: Meeting): Record<string, unknown> {
  return {
    id: m.id,
    title: m.title,
    meeting_date: m.meetingDate,
    file_type: m.fileType,
    file_name: m.fileName,
    file_url: m.fileUrl,
    uploaded_by: m.uploadedBy,
    notes: m.notes,
    hora: m.hora || '',
    tipo: m.tipo || 'Pontual',
    participantes: m.participantes || [],
    local: m.local || '',
    meeting_status: m.meetingStatus || 'Agendada',
    created_at: m.createdAt,
  };
}

function dbToMeeting(row: Record<string, unknown>): Meeting {
  return {
    id: row.id as number,
    title: row.title as string,
    meetingDate: row.meeting_date as string,
    fileType: row.file_type as string as Meeting['fileType'],
    fileName: row.file_name as string,
    fileUrl: row.file_url as string,
    uploadedBy: row.uploaded_by as string,
    notes: row.notes as string,
    hora: row.hora as string,
    tipo: row.tipo as string as Meeting['tipo'],
    participantes: row.participantes as string[],
    local: row.local as string,
    meetingStatus: row.meeting_status as string as Meeting['meetingStatus'],
    createdAt: row.created_at as string,
  };
}

function revendedorToDb(r: Revendedor): Record<string, unknown> {
  return {
    id: r.id,
    nome: r.nome,
    responsavel: r.responsavel,
    status: r.status,
    canal: r.canal,
    cidade: r.cidade,
    volume: r.volume,
    ultima: r.ultima,
    obs: r.obs,
    whatsapp: r.whatsapp,
    instagram: r.instagram,
    email: r.email,
    telefone: r.telefone,
    tags: r.tags,
    score: r.score,
    proxima_acao: r.proximaAcao,
    volume_historico: r.volumeHistorico,
    historico: r.historico,
  };
}

function safeArray<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') { try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
}

function dbToRevendedor(row: Record<string, unknown>): Revendedor {
  return {
    id: row.id as string,
    nome: (row.nome || '') as string,
    responsavel: (row.responsavel || '') as string,
    status: (row.status || 'Novo Lead') as RevendedorStatus,
    canal: (row.canal || 'WhatsApp') as RevendedorCanal,
    cidade: (row.cidade || '') as string,
    volume: (row.volume || 0) as number,
    ultima: (row.ultima || '') as string,
    obs: (row.obs || '') as string,
    whatsapp: (row.whatsapp || '') as string,
    instagram: (row.instagram || '') as string,
    email: (row.email || '') as string,
    telefone: (row.telefone || '') as string,
    tags: safeArray<string>(row.tags),
    score: (row.score || 0) as number,
    proximaAcao: row.proxima_acao as ProximaAcao | null,
    volumeHistorico: safeArray<VolumeHistorico>(row.volume_historico),
    historico: safeArray<Interacao>(row.historico),
  };
}

function activityToDb(a: Activity): Record<string, unknown> {
  return {
    id: a.id,
    task_id: a.taskId,
    task_title: a.taskTitle,
    user_name: a.userName,
    action: a.action,
    old_value: a.oldValue,
    new_value: a.newValue,
    created_at: a.createdAt,
  };
}

function dbToActivity(row: Record<string, unknown>): Activity {
  return {
    id: row.id as number,
    taskId: row.task_id as number,
    taskTitle: row.task_title as string,
    userName: row.user_name as string,
    action: row.action as string,
    oldValue: row.old_value as string | null,
    newValue: row.new_value as string | null,
    createdAt: row.created_at as string,
  };
}

// ─── Seed Data ───

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
  if (r.status === "Ativo" || r.status === "Recorrente") return 90;
  if (r.status === "Em Negociação") return 60;
  if (r.status === "Inativo") return 10;
  return 30;
}

export { calcScore };

function scoreForStatus(status: RevendedorStatus): number {
  if (status === "Novo Lead") return 30;
  if (status === "Em Negociação") return 60;
  if (status === "Ativo" || status === "Recorrente") return 90;
  return 0;
}

function mkLead(nome: string, whatsapp: string, status: RevendedorStatus, tag: string, obs: string, email = "", tags: string[] = []): Revendedor {
  const id = `r_seed_${nome.replace(/\s+/g, '_').toLowerCase()}`;
  const allTags = tag ? [tag, ...tags] : tags;
  return { id, nome, responsavel: "Pedro", status, canal: "WhatsApp" as RevendedorCanal, cidade: "", volume: 0, ultima: "2026-02-20", obs, whatsapp, instagram: "", email, telefone: whatsapp, tags: allTags, score: scoreForStatus(status), proximaAcao: null, volumeHistorico: [], historico: [] };
}

const SEED_REVENDEDORES: Revendedor[] = [
  mkLead("La casa de bebidas011", "11940186098", "Novo Lead", "PJ", "Orçamento"),
  mkLead("jonathanrafael1617", "13997906476", "Em Negociação", "PJ", "Orçamento"),
  mkLead("E.j.v", "71993871410", "Em Negociação", "PJ", "Promessa de retornar"),
  mkLead("GRodrigo", "51986056610", "Novo Lead", "PJ", "Ficou de montar o pedido"),
  mkLead("Martin", "15991897429", "Em Negociação", "PF", "Duvidas esclarecidas"),
  mkLead("Jose H", "95984270519", "Novo Lead", "PF", "Duvidas esclarecidas"),
  mkLead("Fernando Souza", "97584760987", "Em Negociação", "PJ", "Ficou de montar o pedido"),
  mkLead("Bruno", "75999459714", "Em Negociação", "PF", "Duvidas esclarecidas"),
  mkLead("Copão do Japa", "14991887146", "Novo Lead", "PJ", "Duvidas esclarecidas"),
  mkLead("Tardezinha tabacaria", "11968812271", "Novo Lead", "PJ", "Duvidas esclarecidas"),
  mkLead("Gabriel Ml9", "35991430129", "Novo Lead", "PJ", "Duvidas esclarecidas"),
  mkLead("Fruits Saborizado", "21971725245", "Novo Lead", "PJ", "Promessa de retornar"),
  mkLead("Tropa da paz", "31991917021", "Novo Lead", "PF", "Duvidas esclarecidas"),
  mkLead("Armando Pt de galinhas", "81995703909", "Em Negociação", "PJ", "Duvidas esclarecidas"),
  mkLead("Carlos Henrique", "21990524280", "Ativo", "PJ", "Promessa de retornar"),
  mkLead("Adega do Samba", "11954128191", "Novo Lead", "PJ", "Duvidas esclarecidas"),
  mkLead("Tomaz", "61993138243", "Ativo", "PF", "Promessa de retornar"),
  mkLead("Chapa imports", "74991426892", "Em Negociação", "PJ", "Ficou de montar o pedido"),
  mkLead("Distribuidora Pierre", "31982551522", "Novo Lead", "PJ", "Duvidas esclarecidas"),
  mkLead("Corujão do Wjisky", "31989777899", "Novo Lead", "PJ", "Promessa de retornar"),
  mkLead("Destilados OG", "21965007139", "Novo Lead", "PJ", "Duvidas esclarecidas"),
  mkLead("Sandro Marica Beer", "21970280180", "Novo Lead", "PJ", "Duvidas esclarecidas"),
  mkLead("JL Deposito de bebidas", "21966590638", "Novo Lead", "PJ", "Duvidas esclarecidas"),
  mkLead("Cactus Adega", "83993532473", "Novo Lead", "PJ", "Duvidas esclarecidas"),
  mkLead("Adega Pomperson", "31999727872", "Novo Lead", "PJ", "Duvidas esclarecidas"),
  mkLead("Adega Prime", "31980566902", "Novo Lead", "PJ", "Promessa de retornar"),
  mkLead("Primas Açai Disk", "51980415668", "Novo Lead", "PJ", "Duvidas esclarecidas"),
  mkLead("Nicoly Freitas", "27988040292", "Novo Lead", "PJ", "Duvidas esclarecidas"),
  mkLead("Jerman Lounge Bar", "41997116198", "Novo Lead", "PJ", "Orçamento"),
  mkLead("Mercearia Almaeida", "16981095819", "Novo Lead", "PJ", "Duvidas esclarecidas"),
  mkLead("Thiago Delanne", "64999066006", "Novo Lead", "PJ", "Negociação ativa"),
  mkLead("Eduardo Benetti", "51985927052", "Novo Lead", "PJ", "Negociação ativa"),
  mkLead("Adega do Chefe", "14997162909", "Novo Lead", "PJ", "Duvidas esclarecidas"),
  mkLead("Feliphes Beer", "82999624127", "Novo Lead", "PJ", "Duvidas esclarecidas"),
  mkLead("Adega Prime (SP)", "13996000452", "Novo Lead", "PJ", "Negociação ativa"),
  mkLead("Christian RDC", "22998089706", "Novo Lead", "PJ", "Promessa de retornar"),
  mkLead("Taina Lat", "2297764838", "Novo Lead", "PJ", "Promessa de retornar"),
  mkLead("Sodre ML", "94984371244", "Ativo", "PJ", "Promessa de retornar"),
  mkLead("Adega do Tio João", "19986017888", "Novo Lead", "PJ", "Duvidas esclarecidas"),
  mkLead("Conveniencia do Borsoi", "43996447666", "Novo Lead", "PJ", "Ficou de montar o pedido"),
  mkLead("Gabriel Lara", "66996773374", "Novo Lead", "PF", "Negociação ativa"),
  mkLead("Adega irmãos Abdala", "21982535775", "Novo Lead", "PJ", "Negociação ativa"),
  mkLead("Christiano Amaral", "91999190879", "Novo Lead", "PJ", "Negociação ativa"),
  mkLead("Vieira", "91991820317", "Novo Lead", "PJ", "Orçamento"),
  mkLead("Ramon 2R", "28999844424", "Novo Lead", "PJ", "Promessa de retornar"),
  mkLead("Felipe Rosa", "44998648644", "Ativo", "PF", "Duvidas esclarecidas"),
  mkLead("Renato Silva M", "31972512317", "Ativo", "PJ", "Promessa de retornar"),
  mkLead("David Ortis", "48988246782", "Novo Lead", "PJ", "Duvidas esclarecidas"),
  mkLead("Kleweson Alves", "62985009731", "Novo Lead", "PJ", "Dados coletados", "klewerson.comercial@gmail.com"),
  mkLead("Lucas Araujo", "21995619620", "Novo Lead", "PJ", "Orçamento", "araujodeposito12@yahoo.com"),
  mkLead("Felipe Pereira", "11986005423", "Novo Lead", "PJ", "Dados coletados", "felipe.atosproducoes@gmail.com"),
  mkLead("Renan ml", "11944579935", "Novo Lead", "PJ", "Duvidas esclarecidas"),
  mkLead("Detroit club", "41995145287", "Novo Lead", "PJ", "Dados coletados", "detroitclub0702@gmail.com"),
  mkLead("Distribuidora de bebidas", "92985099044", "Novo Lead", "PJ", "Duvidas esclarecidas"),
  mkLead("Italo Gustavo", "92994367494", "Novo Lead", "PJ", "Dados coletados", "gustavoitalo971@gmail.com"),
  mkLead("Jorge Fernando Amaral", "21984648741", "Novo Lead", "PJ", "Tabela enviada", "brallcorretor@gmail.com"),
  mkLead("Lucas Mesquita", "42999991480", "Novo Lead", "PJ", "Promessa de retornar", "lucas98mees@outlook.com"),
  mkLead("Retsharley Miranda", "27997041879", "Novo Lead", "PJ", "Dados coletados", "imml.distri.2025@outlook.com"),
  mkLead("Carita", "67991810724", "Novo Lead", "PJ", "Dados coletados", "limacarita0@gmail.com"),
  mkLead("Ailton", "34997164552", "Novo Lead", "PF", "Duvidas esclarecidas"),
  mkLead("Luiz Felipe Canteiro", "17991283506", "Novo Lead", "PF", "Dados coletados", "luizfelipe1p2c@gmail.com"),
  mkLead("Laura Miranda Guerra", "21975549286", "Novo Lead", "PF", "Dados coletados", "emporioterrabrasilis021@gmail.com"),
  mkLead("Adega do patrao", "19978124061", "Novo Lead", "PF", "Sem resposta"),
  mkLead("Patricia Lima", "66992484922", "Novo Lead", "PF", "Dados coletados", "patricialimaa82@gmail.com"),
  mkLead("Adega do Japa", "66999692637", "Novo Lead", "PF", "Sem resposta"),
  mkLead("Victor", "38999680761", "Novo Lead", "PF", "Sem resposta", "vitorgabriel3567489@gmail.com"),
  mkLead("MA", "34996863713", "Novo Lead", "PF", "Sem resposta", "jhonasgomes09@gmail.com"),
  mkLead("BrunoPitbull", "49998072486", "Novo Lead", "PF", "Sem resposta", "pitbullbruno518@gmail.com"),
  mkLead("Edelsio", "54984381108", "Novo Lead", "PF", "Sem resposta"),
  mkLead("Ramon Lamin", "22999996466", "Novo Lead", "PF", "Duvidas esclarecidas"),
  mkLead("Disk Bebidas", "61998432916", "Novo Lead", "PF", "Sem resposta"),
  mkLead("Ivanildo ms com", "21964649723", "Novo Lead", "PF", "Fazer proposta"),
];

SEED_REVENDEDORES.forEach(r => { r.score = calcScore(r); });

const SEED_MEETINGS: Meeting[] = [
  { id: 9002, title: "Review de Distribuição — Fevereiro", meetingDate: "2026-02-25", fileType: "resumo", fileName: "", fileUrl: "", uploadedBy: "Luca", notes: "Análise de volume por revendedor, metas de março, ações de ativação", createdAt: now(), hora: "14:00", tipo: "Mensal", participantes: ["Luca", "João", "Pedro"], local: "Escritório SP", meetingStatus: "Agendada" },
  { id: 9003, title: "Briefing Campanha Março", meetingDate: "2026-02-26", fileType: "pauta", fileName: "", fileUrl: "", uploadedBy: "Luca", notes: "Definição de criativo, peças e cronograma de conteúdo para março", createdAt: now(), hora: "11:00", tipo: "Pontual", participantes: ["Luca", "Luhan", "Guilherme"], local: "Google Meet", meetingStatus: "Agendada" },
  { id: 9004, title: "Reunião Estratégica Mr. Lion — 13/02", meetingDate: "2026-02-13", fileType: "resumo", fileName: "", fileUrl: "", uploadedBy: "Luca", notes: "Alinhamento estratégico completo. 10 decisões tomadas: Kit Carnaval R$299, migração Nuvemshop prioridade máxima, Nation antes do Orochi, press-kits entregues em mãos no Rio, RTD validar em BH e lançar em Dezembro, rebranding com garrafa nova. 75 min, 13 tópicos cobertos.", createdAt: now(), hora: "14:00", tipo: "Mensal", participantes: ["Luca", "João", "Luhan", "Pedro", "Guilherme"], local: "Google Meet", meetingStatus: "Realizada" },
  { id: 9005, title: "Reunião Estratégica Mr. Lion — 19/02", meetingDate: "2026-02-19", fileType: "resumo", fileName: "", fileUrl: "", uploadedBy: "Luca", notes: "10 decisões: Nuvemshop go-live 25/02, Delivery lança antes do Nation (meta 27/02), Nation piloto primeiro com 1 pessoa, soft launch 50 vagas (final de Abril), ranking público em pontos, Marketplaces até 27/02, Dia do Consumidor semana de desconto, Reunião Vinícius sobre CRM, João faz amostras RTD, Kit PDV aprovado em 5 níveis.", createdAt: now(), hora: "15:34", tipo: "Mensal", participantes: ["Luca", "João", "Luhan", "Pedro", "Guilherme"], local: "Google Meet", meetingStatus: "Realizada" },
];

// ─── Initialization & Sync ───

let _initialized = false;
let _syncInProgress = false;

function initLocalStorage() {
  if (!localStorage.getItem(TASKS_KEY)) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(SEED_TASKS));
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify([]));
    localStorage.setItem(NEXT_ID_KEY, "31000");
  }
  if (!localStorage.getItem(MEETINGS_KEY) || localStorage.getItem("meetings_reset_v3") !== "1") {
    localStorage.setItem(MEETINGS_KEY, JSON.stringify(SEED_MEETINGS));
    localStorage.setItem("meetings_reset_v3", "1");
  }
  if (!localStorage.getItem(CRM_KEY) || localStorage.getItem("crm_reset_v6") !== "1") {
    localStorage.setItem(CRM_KEY, JSON.stringify(SEED_REVENDEDORES));
    localStorage.setItem("crm_reset_v6", "1");
  }
}

function initIfNeeded() {
  if (!_initialized) {
    initLocalStorage();
    _initialized = true;
    // Trigger async sync from Supabase in the background
    if (isSupabaseEnabled) {
      syncFromSupabase();
    }
  }
}

/** Fetch all data from Supabase and update localStorage cache */
async function syncFromSupabase() {
  if (!supabase || _syncInProgress) return;
  _syncInProgress = true;
  try {
    const [tasksRes, activitiesRes, meetingsRes, revsRes, kpisRes] = await Promise.all([
      supabase.from('tasks').select('*').order('id'),
      supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('meetings').select('*').order('created_at', { ascending: false }),
      supabase.from('revendedores').select('*').order('nome'),
      supabase.from('business_kpis').select('*').eq('id', 'default').single(),
    ]);

    if (tasksRes.data && tasksRes.data.length > 0) {
      const tasks = tasksRes.data.map(dbToTask);
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    }
    if (activitiesRes.data && activitiesRes.data.length > 0) {
      const activities = activitiesRes.data.map(dbToActivity);
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities));
    }
    if (meetingsRes.data && meetingsRes.data.length > 0) {
      const meetings = meetingsRes.data.map(dbToMeeting);
      localStorage.setItem(MEETINGS_KEY, JSON.stringify(meetings));
    }
    if (revsRes.data && revsRes.data.length > 0) {
      const revs = revsRes.data.map(dbToRevendedor);
      localStorage.setItem(CRM_KEY, JSON.stringify(revs));
    }
    if (kpisRes.data) {
      const kpis: BusinessKPIs = {
        metaMensal: kpisRes.data.meta_mensal,
        realizado: kpisRes.data.realizado,
        receitaEstimada: kpisRes.data.receita_estimada,
        ticketMedio: kpisRes.data.ticket_medio,
        custoEntrega: kpisRes.data.custo_entrega,
      };
      localStorage.setItem(KPI_KEY, JSON.stringify(kpis));
    }
    notifyListeners();
  } catch (err) {
    console.error('[MR. LION HUB] Sync from Supabase failed:', err);
  } finally {
    _syncInProgress = false;
  }
}

/** Seed Supabase with initial data if tables are empty */
async function seedSupabase() {
  if (!supabase) return;
  try {
    // Check if tasks table has data
    const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
    if (count === 0 || count === null) {
      // Seed tasks
      await supabase.from('tasks').upsert(SEED_TASKS.map(taskToDb));
      // Seed meetings
      await supabase.from('meetings').upsert(SEED_MEETINGS.map(meetingToDb));
      // Seed revendedores
      await supabase.from('revendedores').upsert(SEED_REVENDEDORES.map(revendedorToDb));
      console.log('[MR. LION HUB] Seeded Supabase with initial data');
    }
  } catch (err) {
    console.error('[MR. LION HUB] Seed failed:', err);
  }
}

// ─── Realtime Subscriptions ───

let _realtimeInitialized = false;

export function initRealtime() {
  if (_realtimeInitialized || !supabase) return;
  _realtimeInitialized = true;

  // Seed if needed, then subscribe
  seedSupabase();

  supabase
    .channel('db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
      syncFromSupabase();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, () => {
      syncFromSupabase();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => {
      syncFromSupabase();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'revendedores' }, () => {
      syncFromSupabase();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'business_kpis' }, () => {
      syncFromSupabase();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'presence' }, async () => {
      // Update presence cache
      if (!supabase) return;
      const cutoff = new Date(Date.now() - 120000).toISOString();
      const { data } = await supabase.from('presence').select('name').gte('last_seen', cutoff);
      if (data) {
        const entries = data.map((d: { name: string }) => ({ name: d.name, lastSeen: Date.now() }));
        localStorage.setItem(PRESENCE_KEY, JSON.stringify(entries));
        notifyListeners();
      }
    })
    .subscribe();
}

// ─── Password ───
export function validatePassword(password: string): boolean {
  return password === APP_PASSWORD;
}

// ─── User ───
export function getUser(): string | null { return localStorage.getItem(USER_KEY); }
export function setUser(name: string) { localStorage.setItem(USER_KEY, name); updatePresence(name); }
export function clearUser() { const user = getUser(); if (user) removePresence(user); localStorage.removeItem(USER_KEY); }

// ─── Roles ───
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

// ─── Presence ───
interface PresenceEntry { name: string; lastSeen: number; }

export function getOnlineUsers(): string[] {
  const raw = localStorage.getItem(PRESENCE_KEY);
  if (!raw) return [];
  const entries: PresenceEntry[] = JSON.parse(raw);
  const n = Date.now();
  return entries.filter(e => n - e.lastSeen < 120000).map(e => e.name);
}

export function updatePresence(name: string) {
  // Update localStorage
  const raw = localStorage.getItem(PRESENCE_KEY);
  let entries: PresenceEntry[] = raw ? JSON.parse(raw) : [];
  entries = entries.filter(e => e.name !== name);
  entries.push({ name, lastSeen: Date.now() });
  localStorage.setItem(PRESENCE_KEY, JSON.stringify(entries));

  // Sync to Supabase
  if (supabase) {
    supabase.from('presence').upsert({ name, last_seen: new Date().toISOString() }).then();
  }
}

function removePresence(name: string) {
  const raw = localStorage.getItem(PRESENCE_KEY);
  if (!raw) return;
  let entries: PresenceEntry[] = JSON.parse(raw);
  entries = entries.filter(e => e.name !== name);
  localStorage.setItem(PRESENCE_KEY, JSON.stringify(entries));

  if (supabase) {
    supabase.from('presence').delete().eq('name', name).then();
  }
}

// ─── Tasks ───

export function getTasks(): Task[] { initIfNeeded(); return JSON.parse(localStorage.getItem(TASKS_KEY) || "[]"); }
export function getTaskById(id: number): Task | undefined { return getTasks().find(t => t.id === id); }

export function createTask(data: Omit<Task, "id" | "createdAt" | "updatedAt">): Task {
  const tasks = getTasks();
  const task: Task = { ...data, id: getNextIdSync(), createdAt: now(), updatedAt: now() };
  tasks.push(task);
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));

  // Async: sync to Supabase and get a proper ID
  if (supabase) {
    (async () => {
      const id = await getNextIdAsync();
      const dbTask = { ...task, id };
      await supabase.from('tasks').upsert(taskToDb(dbTask));
      // Update local cache with the server ID
      const currentTasks = JSON.parse(localStorage.getItem(TASKS_KEY) || "[]") as Task[];
      const idx = currentTasks.findIndex(t => t.id === task.id);
      if (idx !== -1) {
        currentTasks[idx].id = id;
        localStorage.setItem(TASKS_KEY, JSON.stringify(currentTasks));
      }
    })();
  }

  return task;
}

export function updateTask(id: number, updates: Partial<Task>): Task | undefined {
  const tasks = getTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return undefined;
  tasks[idx] = { ...tasks[idx], ...updates, updatedAt: now() };
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));

  if (supabase) {
    const dbUpdates: Record<string, unknown> = { updated_at: now() };
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.detail !== undefined) dbUpdates.detail = updates.detail;
    if (updates.responsible !== undefined) dbUpdates.responsible = updates.responsible;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.area !== undefined) dbUpdates.area = updates.area;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.dependencies !== undefined) dbUpdates.dependencies = updates.dependencies;
    if (updates.decision !== undefined) dbUpdates.decision = updates.decision;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.attachments !== undefined) dbUpdates.attachments = updates.attachments;
    supabase.from('tasks').update(dbUpdates).eq('id', id).then();
  }

  return tasks[idx];
}

export function deleteTask(id: number): boolean {
  const tasks = getTasks();
  const filtered = tasks.filter(t => t.id !== id);
  if (filtered.length === tasks.length) return false;
  localStorage.setItem(TASKS_KEY, JSON.stringify(filtered));

  if (supabase) {
    supabase.from('tasks').delete().eq('id', id).then();
  }

  return true;
}

// ─── Activity ───

export function getActivities(): Activity[] { initIfNeeded(); return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]"); }

export function logActivity(data: Omit<Activity, "id" | "createdAt">) {
  const activities = getActivities();
  const activity: Activity = { ...data, id: getNextIdSync(), createdAt: now() };
  activities.unshift(activity);
  if (activities.length > 200) activities.length = 200;
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities));

  if (supabase) {
    (async () => {
      const id = await getNextIdAsync();
      await supabase.from('activities').insert(activityToDb({ ...activity, id }));
    })();
  }
}

// ─── Meetings ───

export function getMeetings(): Meeting[] { initIfNeeded(); return JSON.parse(localStorage.getItem(MEETINGS_KEY) || "[]"); }

export function createMeeting(data: Omit<Meeting, "id" | "createdAt">): Meeting {
  const meetings = getMeetings();
  const meeting: Meeting = { ...data, id: getNextIdSync(), createdAt: now() };
  meetings.unshift(meeting);
  localStorage.setItem(MEETINGS_KEY, JSON.stringify(meetings));

  if (supabase) {
    (async () => {
      const id = await getNextIdAsync();
      await supabase.from('meetings').upsert(meetingToDb({ ...meeting, id }));
    })();
  }

  return meeting;
}

export function updateMeeting(id: number, updates: Partial<Meeting>): Meeting | undefined {
  const meetings = getMeetings();
  const idx = meetings.findIndex(m => m.id === id);
  if (idx === -1) return undefined;
  meetings[idx] = { ...meetings[idx], ...updates };
  localStorage.setItem(MEETINGS_KEY, JSON.stringify(meetings));

  if (supabase) {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.meetingDate !== undefined) dbUpdates.meeting_date = updates.meetingDate;
    if (updates.fileType !== undefined) dbUpdates.file_type = updates.fileType;
    if (updates.fileName !== undefined) dbUpdates.file_name = updates.fileName;
    if (updates.fileUrl !== undefined) dbUpdates.file_url = updates.fileUrl;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.hora !== undefined) dbUpdates.hora = updates.hora;
    if (updates.tipo !== undefined) dbUpdates.tipo = updates.tipo;
    if (updates.participantes !== undefined) dbUpdates.participantes = updates.participantes;
    if (updates.local !== undefined) dbUpdates.local = updates.local;
    if (updates.meetingStatus !== undefined) dbUpdates.meeting_status = updates.meetingStatus;
    supabase.from('meetings').update(dbUpdates).eq('id', id).then();
  }

  return meetings[idx];
}

export function deleteMeeting(id: number): boolean {
  const meetings = getMeetings();
  const filtered = meetings.filter(m => m.id !== id);
  if (filtered.length === meetings.length) return false;
  localStorage.setItem(MEETINGS_KEY, JSON.stringify(filtered));

  if (supabase) {
    supabase.from('meetings').delete().eq('id', id).then();
  }

  return true;
}

// ─── CRM ───

export function getRevendedores(): Revendedor[] {
  initIfNeeded();
  const raw = JSON.parse(localStorage.getItem(CRM_KEY) || "[]");
  return raw.map((r: Record<string, unknown>) => ({
    ...r,
    tags: safeArray<string>(r.tags),
    volumeHistorico: safeArray<VolumeHistorico>(r.volumeHistorico ?? r.volume_historico),
    historico: safeArray<Interacao>(r.historico),
  })) as Revendedor[];
}

export function createRevendedor(data: Omit<Revendedor, "id">): Revendedor {
  const revs = getRevendedores();
  const rev: Revendedor = { ...data, id: `r${Date.now()}` };
  revs.push(rev);
  localStorage.setItem(CRM_KEY, JSON.stringify(revs));

  if (supabase) {
    supabase.from('revendedores').insert(revendedorToDb(rev)).then();
  }

  return rev;
}

export function updateRevendedor(id: string, updates: Partial<Revendedor>): Revendedor | undefined {
  const revs = getRevendedores();
  const idx = revs.findIndex(r => r.id === id);
  if (idx === -1) return undefined;
  revs[idx] = { ...revs[idx], ...updates };
  localStorage.setItem(CRM_KEY, JSON.stringify(revs));

  if (supabase) {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.nome !== undefined) dbUpdates.nome = updates.nome;
    if (updates.responsavel !== undefined) dbUpdates.responsavel = updates.responsavel;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.canal !== undefined) dbUpdates.canal = updates.canal;
    if (updates.cidade !== undefined) dbUpdates.cidade = updates.cidade;
    if (updates.volume !== undefined) dbUpdates.volume = updates.volume;
    if (updates.ultima !== undefined) dbUpdates.ultima = updates.ultima;
    if (updates.obs !== undefined) dbUpdates.obs = updates.obs;
    if (updates.whatsapp !== undefined) dbUpdates.whatsapp = updates.whatsapp;
    if (updates.instagram !== undefined) dbUpdates.instagram = updates.instagram;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.telefone !== undefined) dbUpdates.telefone = updates.telefone;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.score !== undefined) dbUpdates.score = updates.score;
    if (updates.proximaAcao !== undefined) dbUpdates.proxima_acao = updates.proximaAcao;
    if (updates.volumeHistorico !== undefined) dbUpdates.volume_historico = updates.volumeHistorico;
    if (updates.historico !== undefined) dbUpdates.historico = updates.historico;
    supabase.from('revendedores').update(dbUpdates).eq('id', id).then();
  }

  return revs[idx];
}

export function deleteRevendedor(id: string): boolean {
  const revs = getRevendedores();
  const filtered = revs.filter(r => r.id !== id);
  if (filtered.length === revs.length) return false;
  localStorage.setItem(CRM_KEY, JSON.stringify(filtered));

  if (supabase) {
    supabase.from('revendedores').delete().eq('id', id).then();
  }

  return true;
}

// ─── Business KPIs ───
const DEFAULT_KPIS: BusinessKPIs = { metaMensal: 1600, realizado: 619, receitaEstimada: 95175, ticketMedio: 213, custoEntrega: 18.17 };

export function getBusinessKPIs(): BusinessKPIs {
  initIfNeeded();
  const raw = localStorage.getItem(KPI_KEY);
  return raw ? JSON.parse(raw) : DEFAULT_KPIS;
}

export function setBusinessKPIs(kpis: BusinessKPIs) {
  localStorage.setItem(KPI_KEY, JSON.stringify(kpis));

  if (supabase) {
    supabase.from('business_kpis').upsert({
      id: 'default',
      meta_mensal: kpis.metaMensal,
      realizado: kpis.realizado,
      receita_estimada: kpis.receitaEstimada,
      ticket_medio: kpis.ticketMedio,
      custo_entrega: kpis.custoEntrega,
    }).then();
  }
}

// ─── File Upload (Supabase Storage) ───

export async function uploadFile(file: File, taskId: number): Promise<{ url: string; name: string } | null> {
  if (!supabase) {
    // Fallback: return base64 data URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result as string, name: file.name });
      reader.readAsDataURL(file);
    });
  }

  const ext = file.name.split('.').pop();
  const path = `tasks/${taskId}/${Date.now()}_${file.name}`;

  const { error } = await supabase.storage.from('attachments').upload(path, file);
  if (error) {
    console.error('[MR. LION HUB] File upload failed:', error);
    // Fallback to base64
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result as string, name: file.name });
      reader.readAsDataURL(file);
    });
  }

  const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
  return { url: urlData.publicUrl, name: file.name };
}

// ─── Export ───

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
