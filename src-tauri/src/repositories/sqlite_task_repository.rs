use chrono::{DateTime, Utc};
use sqlx::{FromRow, sqlite::SqlitePool};
use uuid::Uuid;

use crate::models::{Task, TaskPriority, TaskStatus};

#[derive(Debug, thiserror::Error)]
pub enum TaskRepositoryError {
    #[error("Ошибка SQLite: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Некорректные данные задачи: {0}")]
    InvalidData(String),
}

#[derive(Debug, FromRow)]
struct TaskRow {
    id: String,
    title: String,
    description: Option<String>,
    status: String,
    priority: String,
    created_at: String,
    updated_at: String,
    due_date: Option<String>,
}

impl TryFrom<TaskRow> for Task {
    type Error = TaskRepositoryError;

    fn try_from(row: TaskRow) -> Result<Self, Self::Error> {
        let parse_datetime = |value: &str| {
            DateTime::parse_from_rfc3339(value)
                .map(|date| date.with_timezone(&Utc))
                .map_err(|error| TaskRepositoryError::InvalidData(error.to_string()))
        };

        let status = match row.status.as_str() {
            "pending" => TaskStatus::Pending,
            "in_progress" => TaskStatus::InProgress,
            "completed" => TaskStatus::Completed,
            value => {
                return Err(TaskRepositoryError::InvalidData(format!(
                    "Неизвестный статус: {value}"
                )));
            }
        };

        let priority = match row.priority.as_str() {
            "low" => TaskPriority::Low,
            "normal" => TaskPriority::Normal,
            "high" => TaskPriority::High,
            "urgent" => TaskPriority::Urgent,
            value => {
                return Err(TaskRepositoryError::InvalidData(format!(
                    "Неизвестный приоритет: {value}"
                )));
            }
        };

        Ok(Task {
            id: Uuid::parse_str(&row.id)
                .map_err(|error| TaskRepositoryError::InvalidData(error.to_string()))?,
            title: row.title,
            description: row.description,
            status,
            priority,
            created_at: parse_datetime(&row.created_at)?,
            updated_at: parse_datetime(&row.updated_at)?,
            due_date: row.due_date.as_deref().map(parse_datetime).transpose()?,
        })
    }
}

#[derive(Clone)]
pub struct SqliteTaskRepository {
    pool: SqlitePool,
}

impl SqliteTaskRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, task: &Task) -> Result<(), TaskRepositoryError> {
        sqlx::query(
            r#"
            INSERT INTO tasks (
                id, title, description, status, priority,
                created_at, updated_at, due_date
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(task.id.to_string())
        .bind(&task.title)
        .bind(&task.description)
        .bind(status_to_string(task.status))
        .bind(priority_to_string(task.priority))
        .bind(task.created_at.to_rfc3339())
        .bind(task.updated_at.to_rfc3339())
        .bind(task.due_date.map(|date| date.to_rfc3339()))
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn list(&self) -> Result<Vec<Task>, TaskRepositoryError> {
        let rows =
            sqlx::query_as::<_, TaskRow>("SELECT * FROM tasks ORDER BY created_at ASC, id ASC")
                .fetch_all(&self.pool)
                .await?;

        rows.into_iter().map(Task::try_from).collect()
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<Task>, TaskRepositoryError> {
        let row = sqlx::query_as::<_, TaskRow>("SELECT * FROM tasks WHERE id = ?")
            .bind(id.to_string())
            .fetch_optional(&self.pool)
            .await?;

        row.map(Task::try_from).transpose()
    }

    pub async fn update(&self, task: &Task) -> Result<bool, TaskRepositoryError> {
        let result = sqlx::query(
            r#"
            UPDATE tasks
            SET title = ?,
                description = ?,
                status = ?,
                priority = ?,
                updated_at = ?,
                due_date = ?
            WHERE id = ?
            "#,
        )
        .bind(&task.title)
        .bind(&task.description)
        .bind(status_to_string(task.status))
        .bind(priority_to_string(task.priority))
        .bind(task.updated_at.to_rfc3339())
        .bind(task.due_date.map(|date| date.to_rfc3339()))
        .bind(task.id.to_string())
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, TaskRepositoryError> {
        let result = sqlx::query("DELETE FROM tasks WHERE id = ?")
            .bind(id.to_string())
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

fn status_to_string(status: TaskStatus) -> &'static str {
    match status {
        TaskStatus::Pending => "pending",
        TaskStatus::InProgress => "in_progress",
        TaskStatus::Completed => "completed",
    }
}

fn priority_to_string(priority: TaskPriority) -> &'static str {
    match priority {
        TaskPriority::Low => "low",
        TaskPriority::Normal => "normal",
        TaskPriority::High => "high",
        TaskPriority::Urgent => "urgent",
    }
}
