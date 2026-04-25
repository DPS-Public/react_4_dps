
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Canvas {
  id: string;
  name: string;
  type: 'ui' | 'ui-editor' | 'db' | 'api' | 'flow' | 'backlog';
  projectId: string;
  data: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'review' | 'closed';
  statusCode: number;
  type: 'bug' | 'feature' | 'task' | 'epic';
  assignee?: string;
  creator: string;
  linkedCanvas?: string;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  closedAt?: Date;
  references: string[];
}

interface AppState {
  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;

  // Projects
  projects: Project[];
  currentProject: Project | null;
  createProject: (name: string) => void;
  selectProject: (projectId: string) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;

  // Canvases
  canvases: Canvas[];
  currentCanvas: Canvas | null;
  activeCanvasType: string;
  createCanvas: (name: string, type: Canvas['type']) => void;
  selectCanvas: (canvasId: string) => void;
  setActiveCanvasType: (type: string) => void;
  updateCanvas: (canvasId: string, updates: Partial<Canvas>) => void;
  duplicateCanvas: (canvasId: string) => void;

  // Tasks
  tasks: Task[];
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'statusCode'>) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Theme
      theme: 'light',
      setTheme: (theme) => set({ theme }),

      // Projects
      projects: [],
      currentProject: null,
      createProject: async(name) => {
        // const res=await
        const project: Project = {
          id: Date.now().toString(),
          name,
          description: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          projects: [...state.projects, project],
          currentProject: project,
        }));
      },
      selectProject: (projectId) => {
        const project = get().projects.find(p => p.id === projectId);
        if (project) {
          set({ currentProject: project });
        }
      },
      updateProject: (projectId, updates) => {
        set((state) => ({
          projects: state.projects.map(p =>
            p.id === projectId ? { ...p, ...updates, updatedAt: new Date() } : p
          ),
          currentProject: state.currentProject?.id === projectId
            ? { ...state.currentProject, ...updates, updatedAt: new Date() }
            : state.currentProject,
        }));
      },

      // Canvases
      canvases: [],
      currentCanvas: null,
      activeCanvasType: 'ui',
      createCanvas: (name, type) => {
        const canvas: Canvas = {
          id: Date.now().toString(),
          name,
          type,
          projectId: get().currentProject?.id || '',
          data: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          canvases: [...state.canvases, canvas],
          currentCanvas: canvas,
        }));
      },
      selectCanvas: (canvasId) => {
        const canvas = get().canvases.find(c => c.id === canvasId);
        if (canvas) {
          set({ currentCanvas: canvas });
        }
      },
      setActiveCanvasType: (type) => set({ activeCanvasType: type }),
      updateCanvas: (canvasId, updates) => {
        set((state) => ({
          canvases: state.canvases.map(c =>
            c.id === canvasId ? { ...c, ...updates, updatedAt: new Date() } : c
          ),
          currentCanvas: state.currentCanvas?.id === canvasId
            ? { ...state.currentCanvas, ...updates, updatedAt: new Date() }
            : state.currentCanvas,
        }));
      },
      duplicateCanvas: (canvasId) => {
        const canvas = get().canvases.find(c => c.id === canvasId);
        if (canvas) {
          const newCanvas: Canvas = {
            ...canvas,
            id: Date.now().toString(),
            name: `${canvas.name} (Copy)`,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          set((state) => ({
            canvases: [...state.canvases, newCanvas],
          }));
        }
      },

      // Tasks
      tasks: [],
      createTask: (task) => {
        const newTask: Task = {
          ...task,
          id: Date.now().toString(),
          statusCode: task.status === 'open' ? 10001 : 
                     task.status === 'in-progress' ? 10002 :
                     task.status === 'review' ? 10003 : 10004,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          tasks: [...state.tasks, newTask],
        }));
      },
      updateTask: (taskId, updates) => {
        set((state) => ({
          tasks: state.tasks.map(t =>
            t.id === taskId ? { 
              ...t, 
              ...updates, 
              updatedAt: new Date(),
              statusCode: updates.status ? 
                (updates.status === 'open' ? 10001 : 
                 updates.status === 'in-progress' ? 10002 :
                 updates.status === 'review' ? 10003 : 10004) : t.statusCode
            } : t
          ),
        }));
      },
      deleteTask: (taskId) => {
        set((state) => ({
          tasks: state.tasks.filter(t => t.id !== taskId),
        }));
      },
    }),
    {
      name: 'ai-agent-builder-store',
    }
  )
);
