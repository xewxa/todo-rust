use chrono::Utc;
use uuid::Uuid;

use crate::models::{Task, TaskDraft, TaskStatus};
use crate::repositories::{SqliteTaskRepository, TaskRepositoryError};

#[derive(Debug, thiserror::Error)]
pub enum TaskError {
    #[error("Название задачи не может быть пустым.")]
    EmptyTitle,

    #[error("Задача с ID {0} не найдена.")]
    NotFound(Uuid),

    #[error(transparent)]
    Repository(#[from] TaskRepositoryError),
}

pub struct TaskService {
    repository: SqliteTaskRepository,
}

impl TaskService {
    pub fn new(repository: SqliteTaskRepository) -> Self {
        Self { repository }
    }

    pub async fn create(&self, draft: TaskDraft) -> Result<Task, TaskError> {
        let title = validate_title(draft.title)?;

        let now = Utc::now();

        let task = Task {
            id: Uuid::new_v4(),
            title,
            description: normalize_description(draft.description),
            status: TaskStatus::Pending,
            priority: draft.priority,
            created_at: now,
            updated_at: now,
            due_date: draft.due_date,
        };

        self.repository.create(&task).await?;

        Ok(task)
    }

    pub async fn list(&self) -> Result<Vec<Task>, TaskError> {
        Ok(self.repository.list().await?)
    }

    pub async fn get(&self, id: Uuid) -> Result<Task, TaskError> {
        self.repository
            .get(id)
            .await?
            .ok_or(TaskError::NotFound(id))
    }

    pub async fn update(&self, id: Uuid, draft: TaskDraft) -> Result<Task, TaskError> {
        let title = validate_title(draft.title)?;

        let mut task = self.get(id).await?;

        task.title = title;
        task.description = normalize_description(draft.description);
        task.due_date = draft.due_date;
        task.priority = draft.priority;
        task.updated_at = Utc::now();

        if !self.repository.update(&task).await? {
            return Err(TaskError::NotFound(id));
        }

        Ok(task)
    }

    pub async fn set_status(&self, id: Uuid, status: TaskStatus) -> Result<Task, TaskError> {
        let mut task = self.get(id).await?;

        task.status = status;
        task.updated_at = Utc::now();

        if !self.repository.update(&task).await? {
            return Err(TaskError::NotFound(id));
        }

        Ok(task)
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), TaskError> {
        if !self.repository.delete(id).await? {
            return Err(TaskError::NotFound(id));
        }

        Ok(())
    }
}

fn validate_title(title: String) -> Result<String, TaskError> {
    let title = title.trim().to_owned();

    if title.is_empty() {
        return Err(TaskError::EmptyTitle);
    }

    Ok(title)
}

fn normalize_description(description: Option<String>) -> Option<String> {
    description.and_then(|value| {
        let value = value.trim().to_owned();

        if value.is_empty() { None } else { Some(value) }
    })
}
