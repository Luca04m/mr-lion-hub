import { Task, Activity, Meeting } from "./types";

const TASKS_KEY = "mrlion_tasks_v2";
const ACTIVITY_KEY = "mrlion_activity_v2";
const MEETINGS_KEY = "mrlion_meetings_v2";
const USER_KEY = "mrlion_user";
const NEXT_ID_KEY = "mrlion_next_id_v2";
const PRESENCE_KEY = "mrlion_presence";

function getNextId(): number {
  const current = parseInt(localStorage.getItem(NEXT_ID_KEY) || "200");
  localStorage.setItem(NEXT_ID_KEY, String(current + 1));
  return current;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

const SEED_TASKS: Task[] = [
  { id: 1, title: "Design da nova garrafa Mr. Lion", detail: "Finalizar arte e mockup 3D da garrafa premium 750ml", responsible: ["Luhan"], priority: "alta", area: "Garrafa Nova", status: "em-andamento", dependencies: [], decision: "Formato slim aprovado", notes: "Aguardando feedback da fábrica", dueDate: daysFromNow(5), createdBy: "Luca", isOriginal: true, createdAt: daysAgo(10), updatedAt: daysAgo(1) },
  { id: 2, title: "Lançamento collab Orochi", detail: "Coordenar lançamento do whisky edição limitada com Orochi", responsible: ["Luca", "Pedro"], priority: "alta", area: "Orochi", status: "pendente", dependencies: [1], decision: null, notes: "", dueDate: daysFromNow(15), createdBy: "Luca", isOriginal: true, createdAt: daysAgo(8), updatedAt: daysAgo(8) },
  { id: 3, title: "Campanha Carnaval 2025", detail: "Criar materiais visuais e estratégia para carnaval", responsible: ["Pedro", "Guilherme"], priority: "alta", area: "Carnaval", status: "atrasada", dependencies: [], decision: "Foco em stories e reels", notes: "Prazo apertado", dueDate: daysAgo(2), createdBy: "Pedro", isOriginal: true, createdAt: daysAgo(20), updatedAt: daysAgo(1) },
  { id: 4, title: "Setup loja Nuvemshop", detail: "Configurar produtos, frete e meios de pagamento na Nuvemshop", responsible: ["João"], priority: "alta", area: "Nuvemshop", status: "em-andamento", dependencies: [], decision: null, notes: "PIX e cartão configurados", dueDate: daysFromNow(3), createdBy: "João", isOriginal: true, createdAt: daysAgo(12), updatedAt: daysAgo(2) },
  { id: 5, title: "Materiais Kit PDV", detail: "Produzir displays, wobblers e adesivos para pontos de venda", responsible: ["Luhan", "Guilherme"], priority: "media", area: "Kit PDV", status: "pendente", dependencies: [1], decision: null, notes: "", dueDate: daysFromNow(10), createdBy: "Luhan", isOriginal: true, createdAt: daysAgo(7), updatedAt: daysAgo(7) },
  { id: 6, title: "Negociação Carlos Prates", detail: "Fechar parceria de distribuição com Carlos Prates", responsible: ["Luca"], priority: "media", area: "Carlos Prates", status: "em-andamento", dependencies: [], decision: "Proposta enviada 15% margem", notes: "Reunião agendada para próxima semana", dueDate: daysFromNow(7), createdBy: "Luca", isOriginal: true, createdAt: daysAgo(15), updatedAt: daysAgo(3) },
  { id: 7, title: "Press-kit para imprensa", detail: "Montar kit digital com fotos, textos e ficha técnica", responsible: ["Pedro"], priority: "baixa", area: "Press-kit", status: "concluida", dependencies: [], decision: null, notes: "Enviado para 12 veículos", dueDate: daysAgo(5), createdBy: "Pedro", isOriginal: true, createdAt: daysAgo(25), updatedAt: daysAgo(5) },
  { id: 8, title: "Conteúdo redes sociais - Março", detail: "Calendário editorial e criação de posts para março", responsible: ["Guilherme", "Luhan"], priority: "media", area: "Conteúdo", status: "pendente", dependencies: [], decision: null, notes: "", dueDate: daysFromNow(8), createdBy: "Guilherme", isOriginal: true, createdAt: daysAgo(5), updatedAt: daysAgo(5) },
  { id: 9, title: "Proposta comercial Nation", detail: "Elaborar proposta de exclusividade para rede Nation", responsible: ["Luca", "João"], priority: "alta", area: "Nation", status: "atrasada", dependencies: [], decision: null, notes: "Pendente aprovação diretoria", dueDate: daysAgo(3), createdBy: "Luca", isOriginal: true, createdAt: daysAgo(14), updatedAt: daysAgo(1) },
  { id: 10, title: "Receita RTD (Ready to Drink)", detail: "Testar e aprovar receita do Mr. Lion RTD lata 350ml", responsible: ["Luca", "Pedro"], priority: "media", area: "RTD", status: "em-andamento", dependencies: [], decision: "Sabor limão siciliano aprovado", notes: "Teste de shelf life em andamento", dueDate: daysFromNow(20), createdBy: "Luca", isOriginal: true, createdAt: daysAgo(30), updatedAt: daysAgo(2) },
  { id: 11, title: "Catálogo digital de produtos", detail: "Criar PDF interativo com todos os produtos da linha", responsible: ["Luhan"], priority: "baixa", area: "Produtos", status: "concluida", dependencies: [], decision: null, notes: "Versão final aprovada", dueDate: daysAgo(10), createdBy: "Luhan", isOriginal: true, createdAt: daysAgo(35), updatedAt: daysAgo(10) },
  { id: 12, title: "Estratégia marketing Q2", detail: "Definir budget, canais e metas de marketing para Q2 2025", responsible: ["Pedro", "Luca"], priority: "alta", area: "Marketing", status: "pendente", dependencies: [3], decision: null, notes: "", dueDate: daysFromNow(12), createdBy: "Pedro", isOriginal: true, createdAt: daysAgo(4), updatedAt: daysAgo(4) },
  { id: 13, title: "Tabela de preços comercial", detail: "Atualizar tabela com novos produtos e margens", responsible: ["João"], priority: "media", area: "Comercial", status: "concluida", dependencies: [], decision: "Margem mínima 25%", notes: "Distribuído para representantes", dueDate: daysAgo(8), createdBy: "João", isOriginal: true, createdAt: daysAgo(18), updatedAt: daysAgo(8) },
  { id: 14, title: "Ensaio fotográfico produtos", detail: "Coordenar ensaio com fotógrafo para todas as garrafas", responsible: ["Luhan", "Pedro"], priority: "media", area: "Conteúdo", status: "pendente", dependencies: [1], decision: null, notes: "Fotógrafo confirmado para dia 15", dueDate: daysFromNow(14), createdBy: "Luhan", isOriginal: true, createdAt: daysAgo(6), updatedAt: daysAgo(6) },
  { id: 15, title: "Contrato distribuição Orochi", detail: "Revisar e assinar contrato da edição limitada", responsible: ["Luca"], priority: "alta", area: "Orochi", status: "pendente", dependencies: [2], decision: null, notes: "Jurídico revisando", dueDate: daysFromNow(10), createdBy: "Luca", isOriginal: true, createdAt: daysAgo(3), updatedAt: daysAgo(3) },
  { id: 16, title: "Setup analytics Nuvemshop", detail: "Configurar Google Analytics e Meta Pixel na loja", responsible: ["João"], priority: "baixa", area: "Nuvemshop", status: "concluida", dependencies: [4], decision: null, notes: "GA4 + Pixel configurados", dueDate: daysAgo(1), createdBy: "João", isOriginal: true, createdAt: daysAgo(10), updatedAt: daysAgo(1) },
];

const SEED_ACTIVITIES: Activity[] = [
  { id: 50, taskId: 7, taskTitle: "Press-kit para imprensa", userName: "Pedro", action: "status_change", oldValue: "em-andamento", newValue: "concluida", createdAt: daysAgo(5) },
  { id: 51, taskId: 4, taskTitle: "Setup loja Nuvemshop", userName: "João", action: "notes_update", oldValue: "", newValue: "PIX e cartão configurados", createdAt: daysAgo(2) },
  { id: 52, taskId: 3, taskTitle: "Campanha Carnaval 2025", userName: "Pedro", action: "status_change", oldValue: "em-andamento", newValue: "atrasada", createdAt: daysAgo(1) },
  { id: 53, taskId: 1, taskTitle: "Design da nova garrafa Mr. Lion", userName: "Luhan", action: "notes_update", oldValue: "", newValue: "Aguardando feedback da fábrica", createdAt: daysAgo(1) },
  { id: 54, taskId: 10, taskTitle: "Receita RTD (Ready to Drink)", userName: "Luca", action: "field_update:decision", oldValue: "", newValue: "Sabor limão siciliano aprovado", createdAt: daysAgo(2) },
];

function initIfNeeded() {
  if (!localStorage.getItem(TASKS_KEY)) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(SEED_TASKS));
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(SEED_ACTIVITIES));
    localStorage.setItem(MEETINGS_KEY, JSON.stringify([]));
    localStorage.setItem(NEXT_ID_KEY, "200");
  }
}

// User
export function getUser(): string | null {
  return localStorage.getItem(USER_KEY);
}
export function setUser(name: string) {
  localStorage.setItem(USER_KEY, name);
  updatePresence(name);
}
export function clearUser() {
  const user = getUser();
  if (user) removePresence(user);
  localStorage.removeItem(USER_KEY);
}

// Presence (simulated with localStorage)
interface PresenceEntry { name: string; lastSeen: number; }
export function getOnlineUsers(): string[] {
  const raw = localStorage.getItem(PRESENCE_KEY);
  if (!raw) return [];
  const entries: PresenceEntry[] = JSON.parse(raw);
  const now = Date.now();
  return entries.filter(e => now - e.lastSeen < 120000).map(e => e.name);
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
export function getTasks(): Task[] {
  initIfNeeded();
  return JSON.parse(localStorage.getItem(TASKS_KEY) || "[]");
}
export function getTaskById(id: number): Task | undefined {
  return getTasks().find(t => t.id === id);
}
export function createTask(data: Omit<Task, "id" | "createdAt" | "updatedAt">): Task {
  const tasks = getTasks();
  const task: Task = { ...data, id: getNextId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  tasks.push(task);
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  return task;
}
export function updateTask(id: number, updates: Partial<Task>): Task | undefined {
  const tasks = getTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return undefined;
  tasks[idx] = { ...tasks[idx], ...updates, updatedAt: new Date().toISOString() };
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
export function getActivities(): Activity[] {
  initIfNeeded();
  return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]");
}
export function logActivity(data: Omit<Activity, "id" | "createdAt">) {
  const activities = getActivities();
  const activity: Activity = { ...data, id: getNextId(), createdAt: new Date().toISOString() };
  activities.unshift(activity);
  if (activities.length > 200) activities.length = 200;
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities));
}

// Meetings
export function getMeetings(): Meeting[] {
  initIfNeeded();
  return JSON.parse(localStorage.getItem(MEETINGS_KEY) || "[]");
}
export function createMeeting(data: Omit<Meeting, "id" | "createdAt">): Meeting {
  const meetings = getMeetings();
  const meeting: Meeting = { ...data, id: getNextId(), createdAt: new Date().toISOString() };
  meetings.unshift(meeting);
  localStorage.setItem(MEETINGS_KEY, JSON.stringify(meetings));
  return meeting;
}
export function deleteMeeting(id: number): boolean {
  const meetings = getMeetings();
  const filtered = meetings.filter(m => m.id !== id);
  if (filtered.length === meetings.length) return false;
  localStorage.setItem(MEETINGS_KEY, JSON.stringify(filtered));
  return true;
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
