
ALTER TABLE tasks
ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal'
CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

CREATE INDEX IF NOT EXISTS idx_tasks_priority
ON tasks(priority);