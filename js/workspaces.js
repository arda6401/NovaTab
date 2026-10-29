/**
 * Workspaces Management Module
 * Create, organize, and launch tab collections with Google Cloud Sync
 */

const DEFAULT_WORKSPACES = [
  {
    id: 'w1',
    name: '🚀 Yazılım & Geliştirme',
    links: [
      { title: 'GitHub', url: 'https://github.com' },
      { title: 'Stack Overflow', url: 'https://stackoverflow.com' },
      { title: 'ChatGPT', url: 'https://chatgpt.com' }
    ]
  },
  {
    id: 'w2',
    name: '☕ Günlük & Mola',
    links: [
      { title: 'YouTube', url: 'https://youtube.com' },
      { title: 'Reddit', url: 'https://reddit.com' },
      { title: 'Twitter / X', url: 'https://twitter.com' }
    ]
  }
];

class WorkspacesManager {
  constructor() {
    this.storageKey = 'nova_workspaces';
    this.workspaces = [];

    this.drawerEl = document.getElementById('workspaces-drawer');
    this.toggleBtn = document.getElementById('workspaces-toggle-btn');
    this.closeBtn = document.getElementById('workspaces-close-btn');
    this.listEl = document.getElementById('workspaces-list');
    this.createBtn = document.getElementById('workspace-create-btn');
    this.saveCurrentTabsBtn = document.getElementById('workspace-save-current-btn');

    this.init();
  }

  async init() {
    await this.loadWorkspaces();
    this.bindEvents();
    this.render();
  }

  async loadWorkspaces() {
    if (window.syncStorage) {
      this.workspaces = await window.syncStorage.get(this.storageKey, DEFAULT_WORKSPACES);
    } else {
      this.workspaces = [...DEFAULT_WORKSPACES];
    }
  }

  async saveWorkspaces() {
    if (window.syncStorage) {
      await window.syncStorage.set(this.storageKey, this.workspaces);
    }
  }

  addWorkspace(name, links = []) {
    const newWs = {
      id: 'ws_' + Date.now(),
      name: name.trim() || 'Yeni Çalışma Alanı',
      links: links
    };
    this.workspaces.unshift(newWs);
    this.saveWorkspaces();
    this.render();
  }

  deleteWorkspace(id) {
    if (confirm('Bu çalışma alanını silmek istediğinize emin misiniz?')) {
      this.workspaces = this.workspaces.filter(w => w.id !== id);
      this.saveWorkspaces();
      this.render();
    }
  }

  openAllTabsInWorkspace(id) {
    const ws = this.workspaces.find(w => w.id === id);
    if (!ws || !ws.links.length) {
      alert('Bu çalışma alanında henüz kayıtlı sekme yok.');
      return;
    }

    ws.links.forEach(link => {
      const target = NovaUtils.safeUrl(link.url);
      if (!target) return;
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: target });
      } else {
        window.open(target, '_blank');
      }
    });
  }

  addLinkToWorkspace(workspaceId, title, url) {
    const ws = this.workspaces.find(w => w.id === workspaceId);
    if (!ws) return;

    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;

    ws.links.push({
      title: title.trim() || finalUrl,
      url: finalUrl
    });

    this.saveWorkspaces();
    this.render();
  }

  deleteLinkFromWorkspace(workspaceId, linkIndex) {
    const ws = this.workspaces.find(w => w.id === workspaceId);
    if (!ws) return;
    ws.links.splice(linkIndex, 1);
    this.saveWorkspaces();
    this.render();
  }

  saveCurrentOpenTabsAsWorkspace() {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        const valid = (tabs || []).filter(t => t.url && !t.url.startsWith('chrome://') && !t.url.includes('newtab.html'));
        if (valid.length === 0) {
          alert('Kaydedilecek harici sekme bulunamadı.');
          return;
        }

        const wsName = prompt('Bu çalışma alanı için bir isim girin:', `Oturum (${new Date().toLocaleDateString('tr-TR')})`);
        if (!wsName) return;

        const links = valid.map(t => ({
          title: t.title || t.url,
          url: t.url
        }));

        this.addWorkspace(wsName, links);
        alert(`"${wsName}" çalışma alanı ${links.length} sekme ile başarıyla oluşturuldu!`);
      });
    } else {
      const wsName = prompt('Çalışma alanı adı:');
      if (wsName) this.addWorkspace(wsName, []);
    }
  }

  render() {
    if (!this.listEl) return;
    this.listEl.innerHTML = '';

    if (this.workspaces.length === 0) {
      this.listEl.innerHTML = `
        <li style="text-align:center; padding: 32px 10px; color: var(--text-faint); font-size: 13px;">
          Henüz oluşturulmuş bir çalışma alanı yok.<br>Yeni bir tane oluşturarak başlayın!
        </li>
      `;
      return;
    }

    this.workspaces.forEach(ws => {
      const card = document.createElement('div');
      card.className = 'workspace-card glass-card';

      let linksHtml = '';
      if (ws.links.length === 0) {
        linksHtml = '<div style="color:var(--text-faint); font-size:12px; padding:6px 0;">Henüz sekme eklenmedi.</div>';
      } else {
        linksHtml = ws.links.map((link, idx) => {
          const safeHref = NovaUtils.safeUrl(link.url);
          const favicon = NovaUtils.faviconUrl(link.url);
          const safeTitle = NovaUtils.escapeHtml(link.title);

          return `
            <div class="ws-link-item">
              <a href="${safeHref}" target="_blank" class="ws-link-content">
                ${favicon ? `<img src="${favicon}" alt="" width="14" height="14">` : ''}
                <span>${safeTitle}</span>
              </a>
              <button class="ws-link-delete" data-ws="${ws.id}" data-idx="${idx}" title="Bağlantıyı Kaldır">✕</button>
            </div>
          `;
        }).join('');
      }

      card.innerHTML = `
        <div class="workspace-header">
          <div class="ws-title-group">
            <h4 class="workspace-title">${NovaUtils.escapeHtml(ws.name)}</h4>
            <span class="ws-count-badge">${ws.links.length} Sekme</span>
          </div>
          <div class="ws-card-actions">
            <button class="glass-btn ws-open-all-btn" data-id="${ws.id}" title="Tüm Sekmeleri Aç">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Tümünü Aç
            </button>
            <button class="icon-btn-subtle ws-delete-btn" data-id="${ws.id}" title="Alanı Sil">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>

        <div class="ws-links-container">
          ${linksHtml}
        </div>

        <div class="ws-add-link-box">
          <input type="text" class="ws-add-input" placeholder="+ Bağlantı ekle (URL veya https://...)">
          <button class="glass-btn ws-add-link-btn" data-id="${ws.id}">Ekle</button>
        </div>
      `;

      // Favicon yüklenemezse sessizce gizle (CSP uyumlu, inline handler'sız)
      card.querySelectorAll('.ws-link-content img').forEach(img => {
        img.addEventListener('error', () => { img.style.display = 'none'; });
      });

      // Event handlers inside workspace card
      card.querySelector('.ws-open-all-btn').addEventListener('click', () => {
        this.openAllTabsInWorkspace(ws.id);
      });

      card.querySelector('.ws-delete-btn').addEventListener('click', () => {
        this.deleteWorkspace(ws.id);
      });

      card.querySelectorAll('.ws-link-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const wsId = e.currentTarget.dataset.ws;
          const idx = parseInt(e.currentTarget.dataset.idx, 10);
          this.deleteLinkFromWorkspace(wsId, idx);
        });
      });

      const addInput = card.querySelector('.ws-add-input');
      const addBtn = card.querySelector('.ws-add-link-btn');

      const submitLink = () => {
        const val = addInput.value.trim();
        if (val) {
          this.addLinkToWorkspace(ws.id, val, val);
          addInput.value = '';
        }
      };

      addBtn.addEventListener('click', submitLink);
      addInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitLink();
      });

      this.listEl.appendChild(card);
    });
  }

  bindEvents() {
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => {
        this.drawerEl.classList.toggle('open');
      });
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => {
        this.drawerEl.classList.remove('open');
      });
    }

    if (this.createBtn) {
      this.createBtn.addEventListener('click', () => {
        const name = prompt('Yeni Çalışma Alanı için bir isim girin:', 'Proje Alanı');
        if (name) this.addWorkspace(name);
      });
    }

    if (this.saveCurrentTabsBtn) {
      this.saveCurrentTabsBtn.addEventListener('click', () => {
        this.saveCurrentOpenTabsAsWorkspace();
      });
    }
  }
}

window.workspacesManager = new WorkspacesManager();
