CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,

    title TEXT NOT NULL
        CHECK (length(trim(title)) > 0),

    description TEXT,

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed')),

    created_at TEXT NOT NULL,

    updated_at TEXT NOT NULL,

    due_date TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_status
    ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_tasks_due_date
    ON tasks(due_date);