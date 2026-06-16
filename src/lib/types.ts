export type TaskStatus = "pendente" | "em-andamento" | "concluida" | "atrasada";
export type TaskPriority = "alta" | "media" | "baixa";
export type FileType = "pauta" | "resumo" | "ata" | "outro";
export type RevendedorStatus = "Ativo" | "Inativo" | "Novo Lead" | "Em Negociação" | "Recorrente";
export type RevendedorCanal = "Instagram" | "WhatsApp" | "Indicação" | "Outros";
export type InteracaoTipo = "WhatsApp" | "Ligação" | "Reunião" | "Email" | "Visita" | "Outro";

export interface Interacao {
  id: string;
  data: string;
  tipo: InteracaoTipo;
  descricao: string;
  autor: string;
}

export interface ProximaAcao {
  data: string;
  descricao: string;
}

export interface VolumeHistorico {
  mes: string;
  volume: number;
}

export interface TaskAttachment {
  name: string;
  data: string;
  type: string;
  label?: string;
  url?: string;
}

export interface Task {
  id: number;
  title: string;
  detail: string;
  responsible: string[];
  priority: TaskPriority;
  area: string;
  status: TaskStatus;
  dependencies: number[];
  decision: string | null;
  notes: string;
  dueDate: string | null;
  createdBy: string;
  isOriginal: boolean;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  attachments?: TaskAttachment[];
  campanha_id?: number;
}

export interface Activity {
  id: number;
  taskId: number;
  taskTitle: string;
  userName: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export type MeetingTipo = "Recorrente" | "Mensal" | "Pontual";
export type MeetingStatus = "Agendada" | "Realizada" | "Cancelada";

export interface Meeting {
  id: number;
  title: string;
  meetingDate: string;
  fileType: FileType;
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  notes: string;
  createdAt: string;
  hora?: string;
  tipo?: MeetingTipo;
  participantes?: string[];
  local?: string;
  meetingStatus?: MeetingStatus;
}

// Paleta sóbria dessaturada (UI tokens — espelha os tokens CSS success/danger/warning/info/gold/neutral)
export const MEETING_TIPO_COLORS: Record<MeetingTipo, string> = {
  "Recorrente": "#5A7CA8",
  "Mensal": "#A8842C",
  "Pontual": "#B8923C",
};

export const MEETING_STATUS_COLORS: Record<MeetingStatus, string> = {
  "Agendada": "#5A7CA8",
  "Realizada": "#4F8A63",
  "Cancelada": "#807B72",
};

export interface Revendedor {
  id: string;
  nome: string;
  responsavel: string;
  status: RevendedorStatus;
  canal: RevendedorCanal;
  cidade: string;
  volume: number;
  ultima: string;
  obs: string;
  whatsapp: string;
  instagram: string;
  email: string;
  telefone: string;
  tags: string[];
  score: number;
  proximaAcao: ProximaAcao | null;
  volumeHistorico: VolumeHistorico[];
  historico: Interacao[];
}

export interface BusinessKPIs {
  metaMensal: number;
  realizado: number;
  receitaEstimada: number;
  ticketMedio: number;
  custoEntrega: number;
}

export const TEAM_MEMBERS = ["Luca", "João", "Luhan", "Pedro", "Guilherme", "Ronaldo", "MD Chefe"];

export const AREAS = [
  "Operacional", "Comercial", "Marketing", "Produto", "Conteúdo",
  "Nuvemshop", "Carnaval", "Orochi", "Nation", "Carlos Prates",
  "Kit PDV", "Garrafa Nova", "RTD", "Produtos", "Press-kit",
];

// Paleta categórica dessaturada/terrosa (distinção sem neon)
export const AREA_COLORS: Record<string, string> = {
  "Operacional": "#78736B",
  "Comercial": "#5A7CA8",
  "Marketing": "#9A6B8A",
  "Produto": "#A8767E",
  "Conteúdo": "#4F8A8A",
  "Nuvemshop": "#6A6BA0",
  "Carnaval": "#B8923C",
  "Orochi": "#B0524B",
  "Nation": "#4F8A63",
  "Carlos Prates": "#8A7BA8",
  "Kit PDV": "#A86B82",
  "Garrafa Nova": "#4F8A80",
  "RTD": "#B07A4B",
  "Produtos": "#8A9A5B",
  "Press-kit": "#8A82A8",
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pendente: "Pendente",
  "em-andamento": "Em Andamento",
  concluida: "Concluída",
  atrasada: "Atrasada",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  pendente: "#807B72",
  "em-andamento": "#5A7CA8",
  concluida: "#4F8A63",
  atrasada: "#B0524B",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  alta: "#B0524B",
  media: "#B8923C",
  baixa: "#807B72",
};

export const FILE_TYPE_LABELS: Record<FileType, string> = {
  pauta: "Pauta",
  resumo: "Resumo",
  ata: "Ata",
  outro: "Outro",
};

export const REVENDEDOR_STATUS_COLORS: Record<RevendedorStatus, string> = {
  "Ativo": "#4F8A63",
  "Inativo": "#807B72",
  "Novo Lead": "#5A7CA8",
  "Em Negociação": "#B8923C",
  "Recorrente": "#A8842C",
};

export const PIPELINE_STAGES: RevendedorStatus[] = ["Novo Lead", "Em Negociação", "Ativo", "Recorrente"];

export const INTERACAO_ICONS: Record<InteracaoTipo, string> = {
  "WhatsApp": "📱",
  "Ligação": "📞",
  "Reunião": "🤝",
  "Email": "✉️",
  "Visita": "🏃",
  "Outro": "📌",
};

// ─── Content Post ───

export type ContentPlatform = "Instagram" | "YouTube" | "TikTok" | "Twitter";
export type ContentType = "Reels" | "Stories" | "Carrossel" | "Feed" | "Short" | "Live" | "Tweet";
export type ContentStatus = "rascunho" | "aprovado" | "agendado" | "publicado";

export interface ContentPost {
  id: number;
  title: string;
  description: string;
  platform: ContentPlatform;
  type: ContentType;
  creator: string;
  status: ContentStatus;
  scheduledDate: string;
  scheduledTime: string;
  caption: string;
  hashtags: string[];
  linkedTaskId: number | null;
  campanha_id?: number;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const CONTENT_CREATORS = ["MD Chefe", "Naju"];

export const PLATFORM_COLORS: Record<ContentPlatform, string> = {
  Instagram: "#A8842C",
  YouTube: "#B0524B",
  TikTok: "#5A7CA8",
  Twitter: "#807B72",
};

export const CONTENT_TYPE_BY_PLATFORM: Record<ContentPlatform, ContentType[]> = {
  Instagram: ["Reels", "Stories", "Carrossel", "Feed"],
  YouTube: ["Short", "Live"],
  TikTok: ["Reels"],
  Twitter: ["Tweet"],
};

export const CONTENT_STATUS_COLORS: Record<ContentStatus, string> = {
  rascunho: "#807B72",
  aprovado: "#5A7CA8",
  agendado: "#B8923C",
  publicado: "#4F8A63",
};

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  rascunho: "Rascunho",
  aprovado: "Aprovado",
  agendado: "Agendado",
  publicado: "Publicado",
};

// ─── Campaigns ───

export interface Phase {
  name: string;
  dateStart: string;
  dateEnd: string;
  description: string;
}

export interface Angle {
  id: number;
  title: string;
  concept: string;
  trigger: string;
  audience: string;
  bestChannel: string;
  risk: string;
}

export interface ScriptTake {
  take: number;
  description: string;
  spoken: string;
}

export interface CampaignAd {
  id: number;
  title: string;
  duration: string;
  objective?: string;
  spoken: string;
  screenText: string;
  captacao: string;
}

export interface CampaignVideo {
  id: number;
  title: string;
  date: string;
  takes: ScriptTake[];
}

export interface CampaignCopy {
  headlines: string[];
  impactPhrases: string[];
  ctas: string[];
  urgencyPhrases: string[];
}

export type CampaignStatus = "rascunho" | "ativa" | "pausada" | "encerrada";

export interface Campaign {
  id: number;
  title: string;
  concept: string;
  tagline: string;
  product: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  channels: string[];
  phases: Phase[];
  angles: Angle[];
  notes: string;
  briefing?: string;
  checklist?: string;
  ads?: CampaignAd[];
  videos?: CampaignVideo[];
  copy?: CampaignCopy;
  createdAt: string;
  updatedAt: string;
}

export const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, string> = {
  rascunho: "#807B72",
  ativa: "#4F8A63",
  pausada: "#B8923C",
  encerrada: "#9C9A92",
};

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  rascunho: "Rascunho",
  ativa: "Ativa",
  pausada: "Pausada",
  encerrada: "Encerrada",
};

export const CAMPAIGN_CHANNELS = [
  "Email", "Instagram Feed", "Reels", "Stories",
  "TikTok", "YouTube", "Tráfego Pago", "WhatsApp", "SMS",
];

export const APP_PASSWORD = "Mrlion@2026";
export const ROLES_KEY = "mrlion_roles";
export const PRIVATE_USERS = ["Luca", "João"] as const;
