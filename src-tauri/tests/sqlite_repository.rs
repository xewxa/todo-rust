use chrono::Utc;
use sqlx::sqlite::SqlitePoolOptions;
use uuid::Uuid;

use todo_rust_lib::models::{Task, TaskPriority, TaskStatus};
use todo_rust_lib::repositories::SqliteTaskRepository;

async fn create_test_repository() -> SqliteTaskRepository {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();

    sqlx::migrate!("./migrations").run(&pool).await.unwrap();

    SqliteTaskRepository::new(pool)
}

fn create_test_task() -> Task {
    let now = Utc::now();

    Task {
        id: Uuid::new_v4(),
        title: "Проверка SQLite".to_owned(),
        description: Some("Тестирование хранения".to_owned()),
        status: TaskStatus::Pending,
        created_at: now,
        updated_at: now,
        due_date: None,
        priority: TaskPriority::Normal,
    }
}

#[tokio::test]
async fn should_create_and_get_task() {
    let repository = create_test_repository().await;
    let task = create_test_task();

    repository.create(&task).await.unwrap();

    let loaded = repository.get(task.id).await.unwrap().unwrap();

    assert_eq!(loaded.id, task.id);
    assert_eq!(loaded.title, task.title);
    assert_eq!(loaded.status, TaskStatus::Pending);
}

#[tokio::test]
async fn should_list_tasks() {
    let repository = create_test_repository().await;

    repository.create(&create_test_task()).await.unwrap();
    repository.create(&create_test_task()).await.unwrap();

    let tasks = repository.list().await.unwrap();

    assert_eq!(tasks.len(), 2);
}

#[tokio::test]
async fn should_update_task() {
    let repository = create_test_repository().await;
    let mut task = create_test_task();

    repository.create(&task).await.unwrap();

    task.title = "Обновлённая задача".to_owned();
    task.status = TaskStatus::Completed;
    task.updated_at = Utc::now();

    assert!(repository.update(&task).await.unwrap());

    let loaded = repository.get(task.id).await.unwrap().unwrap();

    assert_eq!(loaded.title, "Обновлённая задача");
    assert_eq!(loaded.status, TaskStatus::Completed);
}

#[tokio::test]
async fn should_delete_task() {
    let repository = create_test_repository().await;
    let task = create_test_task();

    repository.create(&task).await.unwrap();

    assert!(repository.delete(task.id).await.unwrap());
    assert!(repository.get(task.id).await.unwrap().is_none());
}
