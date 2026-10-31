/**
 * Shortcuts / Speed Dial Manager with Drag & Drop Reordering
 * Fully synced with Google Cloud Sync (chrome.storage.sync)
 */

const DEFAULT_SHORTCUTS = [
  { id: '1', title: 'YouTube', url: 'https://www.youtube.com', custom: false },
  { id: '2', title: 'GitHub', url: 'https://github.com', custom: false },
  { id: '3', title: 'ChatGPT', url: 'https://chatgpt.com', custom: false },
  { id: '4', title: 'X / Twitter', url: 'https://twitter.com', custom: false },
  { id: '5', title: 'Reddit', url: 'https://www.reddit.com', custom: false },
  { id: '6', title: 'Gmail', url: 'https://mail.google.com', custom: false }
];

class ShortcutManager {
  constructor() {
    this.storageKey = 'nova_shortcuts';
    this.shortcuts = [];
    this.draggedIndex = null;

    this.gridEl = document.getElementById('shortcuts-grid');
    this.modalEl = document.getElementById('shortcut-modal');
    this.formEl = document.getElementById('shortcut-form');
    this.titleInput = document.getElementById('shortcut-title-input');
    this.urlInput = document.getElementById('shortcut-url-input');
    this.closeBtn = document.getElementById('shortcut-close-btn');
    this.cancelBtn = document.getElementById('shortcut-cancel-btn');

    // localStorage aynasından senkron ön-baskı: kısayol bölümü ilk boyamada
    // asıl boyutunda olsun (async storage sonradan gelip genişleme kayması yapmasın)
    try {
      const cachedShortcuts = localStorage.getItem(this.storageKey);
      if (cachedShortcuts) this.shortcuts = JSON.parse(cachedShortcuts);
    } catch (e) {}
    if (Array.isArray(this.shortcuts) && this.shortcuts.length) this.render();

    this.init();
  }

  async init() {
    await this.loadShortcuts();
    this.bindEvents();
    this.render();
  }

  async loadShortcuts() {
    if (window.syncStorage) {
      this.shortcuts = await window.syncStorage.get(this.storageKey, DEFAULT_SHORTCUTS);
    } else {
      try {
        const saved = localStorage.getItem(this.storageKey);
        this.shortcuts = saved ? JSON.parse(saved) : [...DEFAULT_SHORTCUTS];
      } catch (e) {
        this.shortcuts = [...DEFAULT_SHORTCUTS];
      }
    }
  }

  async saveShortcuts() {
    if (window.syncStorage) {
      await window.syncStorage.set(this.storageKey, this.shortcuts);
    } else {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.shortcuts));
      } catch (e) {}
    }
  }

  getFaviconUrl(url) {
    return NovaUtils.faviconUrl(url, 64);
  }

  render() {
    if (!this.gridEl) return;
    this.gridEl.innerHTML = '';

    this.shortcuts.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = 'shortcut-item';
      el.setAttribute('draggable', 'true');
      el.dataset.index = index;

      const faviconUrl = NovaUtils.faviconUrl(item.url);
      const initial = item.title ? item.title.charAt(0).toUpperCase() : '🔗';
      const safeTitle = NovaUtils.escapeHtml(item.title || '');
      const safeInitial = NovaUtils.escapeHtml(initial);
      const safeHref = NovaUtils.safeUrl(item.url);

      el.innerHTML = `
        <a href="${safeHref}" class="shortcut-link">
          <div class="shortcut-icon-box">
            ${faviconUrl ? `<img src="${faviconUrl}" alt="${safeTitle}" width="28" height="28" style="border-radius:6px; object-fit:contain;">` : ''}
            <span style="display:${faviconUrl ? 'none' : 'flex'}; font-weight:bold; font-size:18px;">${safeInitial}</span>
          </div>
          <span class="shortcut-title">${safeTitle}</span>
        </a>
        <button class="shortcut-delete-btn" data-id="${NovaUtils.escapeHtml(item.id)}" title="Sil">✕</button>
      `;

      // Favicon yüklenemezse harf fallback'ini göster (CSP uyumlu, inline handler'sız)
      const iconImg = el.querySelector('.shortcut-icon-box img');
      if (iconImg) {
        iconImg.addEventListener('error', () => {
          iconImg.style.display = 'none';
          const fallback = iconImg.nextElementSibling;
          if (fallback) fallback.style.display = 'flex';
        });
      }

      // Drag and Drop Events
      el.addEventListener('dragstart', (e) => {
        this.draggedIndex = index;
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        document.querySelectorAll('.shortcut-item').forEach(i => i.classList.remove('drag-over'));
        this.draggedIndex = null;
      });

      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        el.classList.add('drag-over');
      });

      el.addEventListener('dragleave', () => {
        el.classList.remove('drag-over');
      });

      el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('drag-over');
        if (this.draggedIndex !== null && this.draggedIndex !== index) {
          const itemToMove = this.shortcuts.splice(this.draggedIndex, 1)[0];
          this.shortcuts.splice(index, 0, itemToMove);
          this.saveShortcuts();
          this.render();
        }
      });

      // Delete shortcut
      const deleteBtn = el.querySelector('.shortcut-delete-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.deleteShortcut(item.id);
      });

      this.gridEl.appendChild(el);
    });

    // Add Shortcut Button
    const addBtn = document.createElement('div');
    addBtn.className = 'shortcut-item add-shortcut-btn';
    addBtn.innerHTML = `
      <div class="shortcut-icon-box" style="border-style:dashed;">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </div>
      <span class="shortcut-title">Ekle</span>
    `;
    addBtn.addEventListener('click', () => this.openModal());
    this.gridEl.appendChild(addBtn);
  }

  openModal() {
    if (this.modalEl) {
      this.modalEl.classList.add('open');
      if (this.titleInput) this.titleInput.focus();
    }
  }

  closeModal() {
    if (this.modalEl) {
      this.modalEl.classList.remove('open');
      if (this.formEl) this.formEl.reset();
    }
  }

  addShortcut(title, url) {
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    const newItem = {
      id: Date.now().toString(),
      title: title.trim(),
      url: finalUrl,
      custom: true
    };

    this.shortcuts.push(newItem);
    this.saveShortcuts();
    this.render();
    this.closeModal();
  }

  deleteShortcut(id) {
    this.shortcuts = this.shortcuts.filter(s => s.id !== id);
    this.saveShortcuts();
    this.render();
  }

  bindEvents() {
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.closeModal());
    if (this.cancelBtn) this.cancelBtn.addEventListener('click', () => this.closeModal());

    if (this.modalEl) {
      this.modalEl.addEventListener('click', (e) => {
        if (e.target === this.modalEl) this.closeModal();
      });
    }

    if (this.formEl) {
      this.formEl.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = this.titleInput.value;
        const url = this.urlInput.value;
        if (title && url) {
          this.addShortcut(title, url);
        }
      });
    }
  }
}

window.shortcutManager = new ShortcutManager();
