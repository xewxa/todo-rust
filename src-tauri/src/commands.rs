use sqlx::SqlitePool;
use tauri::State;
use uuid::Uuid;

use crate::models::{Task, TaskDraft, TaskStatus};
use crate::repositories::SqliteTaskRepository;
use crate::services::TaskService;

fn create_service(pool: &SqlitePool) -> TaskService {
    let repository = SqliteTaskRepository::new(pool.clone());
    TaskService::new(repository)
}

/// Получение всех задач.
#[tauri::command]
pub async fn list_tasks(pool: State<'_, SqlitePool>) -> Result<Vec<Task>, String> {
    create_service(&pool)
        .list()
        .await
        .map_err(|error| error.to_string())
}

/// Создание задачи.
#[tauri::command]
pub async fn create_task(pool: State<'_, SqlitePool>, draft: TaskDraft) -> Result<Task, String> {
    create_service(&pool)
        .create(draft)
        .await
        .map_err(|error| error.to_string())
}

/// Получение задачи по ID.
#[tauri::command]
pub async fn get_task(pool: State<'_, SqlitePool>, id: String) -> Result<Task, String> {
    let id = Uuid::parse_str(&id).map_err(|error| error.to_string())?;

    create_service(&pool)
        .get(id)
        .await
        .map_err(|error| error.to_string())
}

/// Редактирование задачи.
#[tauri::command]
pub async fn update_task(
    pool: State<'_, SqlitePool>,
    id: String,
    draft: TaskDraft,
) -> Result<Task, String> {
    let id = Uuid::parse_str(&id).map_err(|error| error.to_string())?;

    create_service(&pool)
        .update(id, draft)
        .await
        .map_err(|error| error.to_string())
}

/// Изменение статуса задачи.
#[tauri::command]
pub async fn set_task_status(
    pool: State<'_, SqlitePool>,
    id: String,
    status: TaskStatus,
) -> Result<Task, String> {
    let id = Uuid::parse_str(&id).map_err(|error| error.to_string())?;

    create_service(&pool)
        .set_status(id, status)
        .await
        .map_err(|error| error.to_string())
}

/// Удаление задачи.
#[tauri::command]
pub async fn delete_task(pool: State<'_, SqlitePool>, id: String) -> Result<(), String> {
    let id = Uuid::parse_str(&id).map_err(|error| error.to_string())?;

    create_service(&pool)
        .delete(id)
        .await
        .map_err(|error| error.to_string())
}
