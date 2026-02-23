import { Task, Activity, Meeting } from "./types";

const TASKS_KEY = "mrlion_tasks";
const ACTIVITY_KEY = "mrlion_activity";
const MEETINGS_KEY = "mrlion_meetings";
const USER_KEY = "mrlion_user";
const NEXT_ID_KEY = "mrlion_next_id";

function getNextId(): number {
  const current = parseInt(localStorage.getItem(NEXT_ID_KEY) || "100");
  localStorage.setItem(NEXT_ID_KEY, String(current + 1));
  return current;
}

// Seed data
const SEED_TASKS: Task[] = [
  {
    id: 1, title: "Criar landing page do projeto", detail: "Desenvolver a página inicial com todas as seções necessárias",
    responsible: ["Luca", "João"], priority: "alta", area: "Desenvolvimento", status: "em-andamento",
    dependencies: [], decision: null, notes: "", createdBy: "Luca", isOriginal: true,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 2, title: "Definir identidade visual", detail: "Criar paleta de cores, tipografia e elementos visuais da marca",
    responsible: ["Luhan"], priority: "alta", area: "Design", status: "concluida",
    dependencies: [], decision: "Usar tons dourados com fundo escuro", notes: "Aprovado pela equipe", createdBy: "Luhan", isOriginal: true,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 3, title: "Plano de marketing digital", detail: "Elaborar estratégia de marketing para redes sociais",
    responsible: ["Pedro", "Guilherme"], priority: "media", area: "Marketing", status: "pendente",
    dependencies: [2], decision: null, notes: "", createdBy: "Pedro", isOriginal: true,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 4, title: "Configurar servidor de produção", detail: "Setup do ambiente de produção com CI/CD",
    responsible: ["João"], priority: "media", area: "Operações", status: "pendente",
    dependencies: [1], decision: null, notes: "", createdBy: "João", isOriginal: true,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 5, title: "Relatório financeiro Q1", detail: "Compilar dados financeiros do primeiro trimestre",
    responsible: ["Guilherme"], priority: "baixa", area: "Financeiro", status: "atrasada",
    dependencies: [], decision: null, notes: "Aguardando dados do contador", createdBy: "Guilherme", isOriginal: true,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
];

function initIfNeeded() {
  if (!localStorage.getItem(TASKS_KEY)) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(SEED_TASKS));
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify([]));
    localStorage.setItem(MEETINGS_KEY, JSON.stringify([]));
    localStorage.setItem(NEXT_ID_KEY, "100");
  }
}

// User
export function getUser(): string | null {
  return localStorage.getItem(USER_KEY);
}
export function setUser(name: string) {
  localStorage.setItem(USER_KEY, name);
}
export function clearUser() {
  localStorage.removeItem(USER_KEY);
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
  // Keep last 200
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
