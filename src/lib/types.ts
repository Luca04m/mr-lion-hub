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

export const MEETING_TIPO_COLORS: Record<MeetingTipo, string> = {
  "Recorrente": "#3B82F6",
  "Mensal": "#8B5CF6",
  "Pontual": "#F59E0B",
};

export const MEETING_STATUS_COLORS: Record<MeetingStatus, string> = {
  "Agendada": "#3B82F6",
  "Realizada": "#22C55E",
  "Cancelada": "#6B7280",
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

export const TEAM_MEMBERS = ["Luca", "João", "Luhan", "Pedro", "Guilherme"];

export const AREAS = [
  "Operacional", "Comercial", "Marketing", "Produto", "Conteúdo",
  "Nuvemshop", "Carnaval", "Orochi", "Nation", "Carlos Prates",
  "Kit PDV", "Garrafa Nova", "RTD", "Produtos", "Press-kit",
];

export const AREA_COLORS: Record<string, string> = {
  "Operacional": "#64748B",
  "Comercial": "#3B82F6",
  "Marketing": "#E879F9",
  "Produto": "#F472B6",
  "Conteúdo": "#06B6D4",
  "Nuvemshop": "#6366F1",
  "Carnaval": "#F59E0B",
  "Orochi": "#EF4444",
  "Nation": "#10B981",
  "Carlos Prates": "#8B5CF6",
  "Kit PDV": "#EC4899",
  "Garrafa Nova": "#14B8A6",
  "RTD": "#F97316",
  "Produtos": "#84CC16",
  "Press-kit": "#A78BFA",
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pendente: "Pendente",
  "em-andamento": "Em Andamento",
  concluida: "Concluída",
  atrasada: "Atrasada",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  pendente: "#6B7280",
  "em-andamento": "#3B82F6",
  concluida: "#22C55E",
  atrasada: "#EF4444",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  alta: "#EF4444",
  media: "#F59E0B",
  baixa: "#6B7280",
};

export const FILE_TYPE_LABELS: Record<FileType, string> = {
  pauta: "Pauta",
  resumo: "Resumo",
  ata: "Ata",
  outro: "Outro",
};

export const REVENDEDOR_STATUS_COLORS: Record<RevendedorStatus, string> = {
  "Ativo": "#22C55E",
  "Inativo": "#6B7280",
  "Novo Lead": "#3B82F6",
  "Em Negociação": "#F59E0B",
  "Recorrente": "#8B5CF6",
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

export const APP_PASSWORD = "Mrlion@2026";
export const ROLES_KEY = "mrlion_roles";
