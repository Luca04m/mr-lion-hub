export type TaskStatus = "pendente" | "em-andamento" | "concluida" | "atrasada";
export type TaskPriority = "alta" | "media" | "baixa";
export type FileType = "pauta" | "resumo" | "ata" | "outro";

export interface TaskAttachment {
  name: string;
  data: string; // base64
  type: string;
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
}

export const TEAM_MEMBERS = ["Luca", "João", "Luhan", "Pedro", "Guilherme"];

export const AREAS = [
  "Nuvemshop", "Carnaval", "Orochi", "Nation", "Carlos Prates",
  "Comercial", "Kit PDV", "Garrafa Nova", "RTD", "Conteúdo",
  "Produtos", "Marketing", "Press-kit",
];

export const AREA_COLORS: Record<string, string> = {
  "Nuvemshop": "#6366F1",
  "Carnaval": "#F59E0B",
  "Orochi": "#EF4444",
  "Nation": "#10B981",
  "Carlos Prates": "#8B5CF6",
  "Comercial": "#3B82F6",
  "Kit PDV": "#EC4899",
  "Garrafa Nova": "#14B8A6",
  "RTD": "#F97316",
  "Conteúdo": "#06B6D4",
  "Produtos": "#84CC16",
  "Marketing": "#E879F9",
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

export const APP_PASSWORD = "Mrlion@2026";

export const ROLES_KEY = "mrlion_roles";
