
export type TaskStatus = "pending" | "in_progress" | "completed";

export type TaskPriority = "low" | "normal" | "high" | "urgent";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
}

export interface TaskDraft {
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: TaskPriority;
}
