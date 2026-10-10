export type Priority = 'essential' | 'important' | 'secondary';
export type TaskStatus = 'todo' | 'in_progress' | 'completed';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  project: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string | null;
  estimatedMinutes?: number;
  subtasks: Subtask[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number | null;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  description: string;
}

export interface DevicePresence {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  lastSeen: number;
}

export interface WorkspaceData {
  tasks: Task[];
  projects: Project[];
  lastModified: number;
  devices: Record<string, DevicePresence>;
}

export type ViewMode = 'today' | 'agenda' | 'spaces' | 'archive';
