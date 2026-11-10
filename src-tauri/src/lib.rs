pub mod commands;
pub mod models;
pub mod repositories;
pub mod services;

use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;

            std::fs::create_dir_all(&app_data_dir)?;

            let database_path = app_data_dir.join("todo.db");
            println!("SQLite database: {}", database_path.display());

            let options = SqliteConnectOptions::new()
                .filename(&database_path)
                .create_if_missing(true)
                .foreign_keys(true);

            let pool = tauri::async_runtime::block_on(async {
                let pool = SqlitePoolOptions::new()
                    .max_connections(5)
                    .connect_with(options)
                    .await?;

                sqlx::migrate!("./migrations").run(&pool).await?;

                Ok::<_, Box<dyn std::error::Error>>(pool)
            })?;

            app.manage(pool);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_tasks,
            commands::create_task,
            commands::get_task,
            commands::update_task,
            commands::set_task_status,
            commands::delete_task,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
