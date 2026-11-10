
import { invoke } from "@tauri-apps/api/core";

import type { Task, TaskDraft, TaskStatus } from "../types/task";

/**
 * Получить все задачи.
 */
export async function getTasks(): Promise<Task[]> {
  return invoke<Task[]>("list_tasks");
}

/**
 * Получить задачу по ID.
 */
export async function getTask(id: string): Promise<Task> {
  return invoke<Task>("get_task", { id });
}

/**
 * Создать задачу.
 */
export async function createTask(draft: TaskDraft): Promise<Task> {
  return invoke<Task>("create_task", { draft });
}

/**
 * Обновить задачу.
 */
export async function updateTask(
  id: string,
  draft: TaskDraft,
): Promise<Task> {
  return invoke<Task>("update_task", { id, draft });
}

/**
 * Изменить статус задачи.
 */
export async function setTaskStatus(
  id: string,
  status: TaskStatus,
): Promise<Task> {
  return invoke<Task>("set_task_status", { id, status });
}

/**
 * Удалить задачу.
 */
export async function deleteTask(id: string): Promise<void> {
  return invoke<void>("delete_task", { id });
}
