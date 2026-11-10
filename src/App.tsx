
import { useEffect, useState, type FormEvent } from "react";
import "./App.css";

import { createTask, deleteTask, getTasks, setTaskStatus, updateTask } from "./services/taskService";
import type { Task, TaskDraft } from "./types/task";

type Section = "Все задачи" | "Сегодня" | "Предстоящие" | "Выполненные";
type SortMode = "newest" | "oldest" | "dueDate";

const sections: { label: Section; icon: string }[] = [
  { label: "Все задачи", icon: "▤" },
  { label: "Сегодня", icon: "◷" },
  { label: "Предстоящие", icon: "▦" },
  { label: "Выполненные", icon: "✓" },
];


function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value: string): string {
  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getStatusLabel(status: Task["status"]): string {
  switch (status) {
    case "pending":
      return "Ожидает";
    case "in_progress":
      return "В работе";
    case "completed":
      return "Выполнена";
  }
}

function App() {
  const [activeSection, setActiveSection] = useState<Section>("Все задачи");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  async function loadTasks() {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getTasks();
      setTasks(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTasks();
  }, []);

  function openComposer() {
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setDueDate("");
    setError(null);
    setShowComposer(true);
  }

  function closeComposer() {
    if (isSaving) return;

    setShowComposer(false);
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setDueDate("");
  }

  function openEditForm(task: Task) {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description ?? "");
    setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
    setError(null);
    setShowComposer(true);
  }

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      setError("Введите название задачи.");
      return;
    }

    const draft: TaskDraft = {
      title: normalizedTitle,
      description: description.trim() || null,
      dueDate: dueDate ? `${dueDate}T23:59:59.000Z` : null,
    };

    setIsSaving(true);
    setError(null);

    try {
      if (editingTask) {
        await updateTask(editingTask.id, draft);
      } else {
        await createTask(draft);
      }

      await loadTasks();

      setTitle("");
      setDescription("");
      setDueDate("");
      setEditingTask(null);
      setShowComposer(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteTask(task: Task) {
    const confirmed = window.confirm(
      `Удалить задачу «${task.title}»? Это действие нельзя отменить.`,
    );

    if (!confirmed) return;

    setError(null);

    try {
      await deleteTask(task.id);

      setTasks((currentTasks) =>
        currentTasks.filter((item) => item.id !== task.id),
      );

      if (editingTask?.id === task.id) {
        closeComposer();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleStatusChange(
    task: Task,
    newStatus: Task["status"],
  ) {
    if (task.status === newStatus) return;

    setUpdatingTaskId(task.id);
    setError(null);

    try {
      const updatedTask = await setTaskStatus(task.id, newStatus);

      setTasks((currentTasks) =>
        currentTasks.map((item) =>
          item.id === updatedTask.id ? updatedTask : item,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUpdatingTaskId(null);
    }
  }
  
  const today = getDateKey(new Date());

  const activeTasks = tasks.filter(
    (task) => task.status !== "completed",
  );

  const completedCount = tasks.filter(
    (task) => task.status === "completed",
  ).length;

  const todayCount = activeTasks.filter(
    (task) => task.dueDate?.slice(0, 10) === today,
  ).length;

  const upcomingCount = activeTasks.filter(
    (task) =>
      task.dueDate !== null &&
      task.dueDate.slice(0, 10) > today,
  ).length;

  const filteredTasks = tasks
  .filter((task) => {
    switch (activeSection) {
      case "Все задачи":
        return task.status !== "completed";

      case "Сегодня":
        return (
          task.status !== "completed" &&
          task.dueDate?.slice(0, 10) === today
        );

      case "Предстоящие":
        return (
          task.status !== "completed" &&
          task.dueDate !== null &&
          task.dueDate.slice(0, 10) > today
        );

      case "Выполненные":
        return task.status === "completed";

      default:
        return true;
    }
  })
  .filter((task) => {
    const query = searchQuery.trim().toLocaleLowerCase("ru");

    if (!query) return true;

    return (
      task.title.toLocaleLowerCase("ru").includes(query) ||
      (task.description ?? "").toLocaleLowerCase("ru").includes(query)
    );
  })
  .sort((a, b) => {
    switch (sortMode) {
      case "newest":
        return b.createdAt.localeCompare(a.createdAt);

      case "oldest":
        return a.createdAt.localeCompare(b.createdAt);

      case "dueDate":
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;

        return a.dueDate.localeCompare(b.dueDate);

      default:
        return 0;
    }
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">✓</div>
          <span>
            Todo<span className="brand-accent">Rust</span>
          </span>
        </div>

        <button className="new-task-button" onClick={openComposer}>
          <span className="plus-icon">＋</span>
          Новая задача
          <span className="shortcut">N</span>
        </button>

        <div className="sidebar-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>

        <nav className="navigation">
          {sections.map((section) => (
            <button
              key={section.label}
              className={`nav-item ${
                activeSection === section.label ? "active" : ""
              }`}
              onClick={() => setActiveSection(section.label)}
            >
              <span className="nav-icon">{section.icon}</span>
              <span>{section.label}</span>

              {section.label === "Все задачи" && (
                <span className="nav-count">{activeTasks.length}</span>
              )}

              {section.label === "Сегодня" && (
                <span className="nav-count">{todayCount}</span>
              )}

              {section.label === "Предстоящие" && (
                <span className="nav-count">{upcomingCount}</span>
              )}

              {section.label === "Выполненные" && (
                <span className="nav-count">{completedCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-divider" />
          <div className="profile">
            <div className="avatar">U</div>
            <div className="profile-info">
              <span className="profile-name">Локальный профиль</span>
              <span className="profile-status">На этом устройстве</span>
            </div>
            <span className="profile-menu">···</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Рабочее пространство</span>
            <span className="breadcrumb-separator">/</span>
            <strong>{activeSection}</strong>
          </div>

          <div className="topbar-actions">
            <span className="local-badge">
              <span className="status-dot" />
              Локальный режим
            </span>
            <button
              className="icon-button"
              title="Настройки появятся на следующем этапе"
              aria-label="Настройки"
              disabled
            >
              ⚙
            </button>
          </div>
        </header>

        <section className="content-area">
          <div className="page-heading">
            <div>
              <div className="eyebrow">МОИ ЗАДАЧИ</div>
              <h1>{activeSection}</h1>
              <p className="page-description">
                Организуйте дела и держите важное под контролем.
              </p>
            </div>

            <button className="primary-button" onClick={openComposer}>
              <span>＋</span>
              Добавить задачу
            </button>
          </div>

          {error && (
            <div className="error-message" role="alert">
              <span>{error}</span>
              <button
                className="close-button"
                onClick={() => setError(null)}
                aria-label="Закрыть сообщение"
              >
                ×
              </button>
            </div>
          )}

          {showComposer && (
            <form className="task-form" onSubmit={handleCreateTask}>
              <div className="form-heading">
                <strong>{editingTask ? "Редактирование задачи" : "Новая задача"}</strong>
                <button
                  type="button"
                  className="close-button"
                  onClick={closeComposer}
                  aria-label="Закрыть форму"
                  disabled={isSaving}
                >
                  ×
                </button>
              </div>

              <label className="form-field">
                <span>Название задачи *</span>
                <input
                  autoFocus
                  type="text"
                  placeholder="Например, подготовить отчёт"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={200}
                  required
                />
              </label>

              <label className="form-field">
                <span>Описание</span>
                <textarea
                  placeholder="Дополнительная информация (необязательно)"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                />
              </label>

              <label className="form-field">
                <span>Срок выполнения</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </label>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeComposer}
                  disabled={isSaving}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={isSaving}
                >
                  {isSaving ? "Сохранение..." : editingTask ? "Сохранить изменения" : "Сохранить задачу"}
                </button>
              </div>
            </form>
          )}

        <div className="task-controls">
          <div className="search-box">
            <span className="search-icon">⌕</span>
            <input
              type="search"
              placeholder="Поиск задач..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="Поиск задач"
            />

            {searchQuery && (
              <button
                type="button"
                className="clear-search"
                onClick={() => setSearchQuery("")}
                aria-label="Очистить поиск"
              >
                ×
              </button>
            )}
          </div>

          <label className="sort-control">
            <span>Сортировка:</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              <option value="newest">Сначала новые</option>
              <option value="oldest">Сначала старые</option>
              <option value="dueDate">По сроку выполнения</option>
            </select>
          </label>
        </div>

          <div className="task-toolbar">
            <span className="task-toolbar-title">Список задач</span>
           <span className="task-total">
              {filteredTasks.length}{" "}
              {filteredTasks.length === 1
                ? "задача"
                : filteredTasks.length % 10 >= 2 &&
                    filteredTasks.length % 10 <= 4 &&
                    (filteredTasks.length % 100 < 12 ||
                      filteredTasks.length % 100 > 14)
                  ? "задачи"
                  : "задач"}
            </span>
          </div>

          {isLoading ? (
            <div className="list-message">Загрузка задач...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-illustration">
                <div className="empty-circle">
                  <div className="empty-checklist">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="empty-plus">＋</div>
                </div>
              </div>

              <h2>
                {tasks.length === 0
                  ? "Пока здесь пусто"
                  : `В разделе «${activeSection}» нет задач`}
              </h2>
              <p>
                {tasks.length === 0
                  ? "Задачи появятся здесь после добавления."
                  : "Попробуйте выбрать другой раздел или добавить новую задачу."}
                <br />
                Начните с небольшого дела.
              </p>

              <button className="empty-action" onClick={openComposer}>
                <span>＋</span>
                Создать первую задачу
              </button>
            </div>
          ) : (
            <div className="task-list">
              {filteredTasks.map((task) => (
                <article className="task-card" key={task.id}>
                  <div className="task-card-main">
                    <div className="task-card-title">{task.title}</div>

                    {task.description && (
                      <p className="task-card-description">
                        {task.description}
                      </p>
                    )}

                    <div className="task-card-meta">
                      <span className={`task-status ${task.status}`}>
                        {getStatusLabel(task.status)}
                      </span>

                      {task.dueDate && (
                        <span className="task-due-date">
                          Срок: {formatDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                    <label className="status-control">
                      <span>Статус:</span>
                      <select
                        value={task.status}
                        disabled={updatingTaskId === task.id}
                        onChange={(event) =>
                          void handleStatusChange(
                            task,
                            event.target.value as Task["status"],
                          )
                        }
                        aria-label={`Статус задачи: ${task.title}`}
                      >
                        <option value="pending">Ожидает</option>
                        <option value="in_progress">В работе</option>
                        <option value="completed">Выполнена</option>
                      </select>
                    </label>
                  </div>
                  <div className="task-card-actions">
                    <button
                      type="button"
                      className="task-action-button"
                      onClick={() => openEditForm(task)}
                      title="Редактировать задачу"
                    >
                      Изменить
                    </button>

                    <button
                      type="button"
                      className="task-action-button delete"
                      onClick={() => void handleDeleteTask(task)}
                      title="Удалить задачу"
                    >
                      Удалить
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <footer className="content-footer">
            <span>TodoRust</span>
            <span>Все данные хранятся локально</span>
          </footer>
        </section>
      </main>
    </div>
  );
}

export default App;
