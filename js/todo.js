/**
 * To-Do List Manager
 * Manage tasks with status filters, persistent cloud storage sync, and task count badge
 */

class TodoManager {
  constructor() {
    this.storageKey = 'nova_todos';
    this.todos = [];
    this.currentFilter = 'all';

    this.drawerEl = document.getElementById('todo-drawer');
    this.toggleBtn = document.getElementById('todo-toggle-btn');
    this.closeBtn = document.getElementById('todo-close-btn');
    this.formEl = document.getElementById('todo-form');
    this.inputEl = document.getElementById('todo-input');
    this.listEl = document.getElementById('todo-list');
    this.badgeEl = document.getElementById('todo-badge');
    this.countAllEl = document.getElementById('todo-count-all');
    this.clearCompletedBtn = document.getElementById('todo-clear-completed');

    this.init();
  }

  async init() {
    await this.loadTodos();
    this.bindEvents();
    this.render();
  }

  async loadTodos() {
    if (window.syncStorage) {
      this.todos = await window.syncStorage.get(this.storageKey, [
        { id: '1', text: 'Önemli projeyi tamamla', completed: false },
        { id: '2', text: 'Yeni sekme eklentisini test et', completed: true }
      ]);
    } else {
      try {
        const saved = localStorage.getItem(this.storageKey);
        this.todos = saved ? JSON.parse(saved) : [];
      } catch (e) {
        this.todos = [];
      }
    }
  }

  async saveTodos() {
    if (window.syncStorage) {
      await window.syncStorage.set(this.storageKey, this.todos);
    } else {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.todos));
      } catch (e) {}
    }
    this.updateBadge();
  }

  addTodo(text) {
    if (!text.trim()) return;
    const newTodo = {
      id: Date.now().toString(),
      text: text.trim(),
      completed: false
    };
    this.todos.unshift(newTodo);
    this.saveTodos();
    this.render();
    if (this.inputEl) this.inputEl.value = '';
  }

  toggleTodo(id) {
    const item = this.todos.find(t => t.id === id);
    if (item) {
      item.completed = !item.completed;
      this.saveTodos();
      this.render();
    }
  }

  deleteTodo(id) {
    this.todos = this.todos.filter(t => t.id !== id);
    this.saveTodos();
    this.render();
  }

  clearCompleted() {
    this.todos = this.todos.filter(t => !t.completed);
    this.saveTodos();
    this.render();
  }

  updateBadge() {
    const activeCount = this.todos.filter(t => !t.completed).length;
    if (this.badgeEl) this.badgeEl.textContent = activeCount;
    if (this.countAllEl) this.countAllEl.textContent = this.todos.length;
  }

  render() {
    if (!this.listEl) return;
    this.listEl.innerHTML = '';

    const filtered = this.todos.filter(t => {
      if (this.currentFilter === 'active') return !t.completed;
      if (this.currentFilter === 'completed') return t.completed;
      return true;
    });

    if (filtered.length === 0) {
      this.listEl.innerHTML = `
        <li style="text-align:center; padding: 24px 0; color: var(--text-faint); font-size: 13px;">
          ${this.currentFilter === 'completed' ? 'Tamamlanan görev yok.' : 'Henüz yapılacak bir görev yok!'}
        </li>
      `;
      this.updateBadge();
      return;
    }

    filtered.forEach(item => {
      const li = document.createElement('li');
      li.className = `todo-item ${item.completed ? 'completed' : ''}`;
      li.innerHTML = `
        <div class="todo-item-left">
          <input type="checkbox" class="todo-checkbox" ${item.completed ? 'checked' : ''}>
          <span class="todo-label">${NovaUtils.escapeHtml(item.text)}</span>
        </div>
        <button class="icon-btn-subtle todo-delete-btn" title="Görevi Sil">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      `;

      const checkbox = li.querySelector('.todo-checkbox');
      checkbox.addEventListener('change', () => this.toggleTodo(item.id));

      const deleteBtn = li.querySelector('.todo-delete-btn');
      deleteBtn.addEventListener('click', () => this.deleteTodo(item.id));

      this.listEl.appendChild(li);
    });

    this.updateBadge();
  }

  bindEvents() {
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => {
        this.drawerEl.classList.toggle('open');
        if (this.drawerEl.classList.contains('open')) {
          if (this.inputEl) this.inputEl.focus();
        }
      });
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => {
        this.drawerEl.classList.remove('open');
      });
    }

    if (this.formEl) {
      this.formEl.addEventListener('submit', (e) => {
        e.preventDefault();
        this.addTodo(this.inputEl.value);
      });
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentFilter = e.currentTarget.dataset.filter;
        this.render();
      });
    });

    if (this.clearCompletedBtn) {
      this.clearCompletedBtn.addEventListener('click', () => this.clearCompleted());
    }
  }
}

window.todoManager = new TodoManager();
