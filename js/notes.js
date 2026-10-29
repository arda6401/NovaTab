/**
 * Quick Notes / Scratchpad Manager
 * Real-time debounced auto-save with word/character count & Cloud Sync
 */

class NotesManager {
  constructor() {
    this.storageKey = 'nova_scratchpad';
    this.drawerEl = document.getElementById('notes-drawer');
    this.toggleBtn = document.getElementById('notes-toggle-btn');
    this.closeBtn = document.getElementById('notes-close-btn');
    this.textareaEl = document.getElementById('quick-notes');
    this.wordCountEl = document.getElementById('notes-word-count');
    this.savedIndicatorEl = document.getElementById('notes-saved-indicator');
    this.saveTimeout = null;

    this.init();
  }

  async init() {
    await this.loadNote();
    this.bindEvents();
    this.updateCounts();
  }

  async loadNote() {
    if (window.syncStorage) {
      const content = await window.syncStorage.get(this.storageKey, '');
      if (content && this.textareaEl) {
        this.textareaEl.value = content;
      }
    } else {
      try {
        const content = localStorage.getItem(this.storageKey);
        if (content && this.textareaEl) this.textareaEl.value = content;
      } catch (e) {}
    }
  }

  async saveNote() {
    if (!this.textareaEl) return;
    const content = this.textareaEl.value;
    if (window.syncStorage) {
      await window.syncStorage.set(this.storageKey, content);
    } else {
      try { localStorage.setItem(this.storageKey, content); } catch(e) {}
    }
    this.showSavedIndicator();
  }

  showSavedIndicator() {
    if (this.savedIndicatorEl) {
      this.savedIndicatorEl.classList.add('show');
      setTimeout(() => {
        this.savedIndicatorEl.classList.remove('show');
      }, 1500);
    }
  }

  updateCounts() {
    if (!this.textareaEl || !this.wordCountEl) return;
    const text = this.textareaEl.value.trim();
    const chars = text.length;
    const words = text ? text.split(/\s+/).length : 0;
    this.wordCountEl.textContent = `${words} kelime, ${chars} karakter`;
  }

  bindEvents() {
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => {
        this.drawerEl.classList.toggle('open');
        if (this.drawerEl.classList.contains('open')) {
          if (this.textareaEl) this.textareaEl.focus();
        }
      });
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => {
        this.drawerEl.classList.remove('open');
      });
    }

    if (this.textareaEl) {
      this.textareaEl.addEventListener('input', () => {
        this.updateCounts();
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
          this.saveNote();
        }, 400);
      });
    }
  }
}

window.notesManager = new NotesManager();
