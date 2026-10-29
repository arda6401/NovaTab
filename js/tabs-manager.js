/**
 * Chrome Tabs Manager Module
 * Allows listing, searching, switching to, closing tabs, and parking sessions
 */

class TabsManager {
  constructor() {
    this.tabs = [];
    this.drawerEl = document.getElementById('tabs-drawer');
    this.toggleBtn = document.getElementById('tabs-toggle-btn');
    this.closeBtn = document.getElementById('tabs-close-btn');
    this.listEl = document.getElementById('tabs-list');
    this.badgeEl = document.getElementById('tabs-badge');
    this.searchInput = document.getElementById('tabs-search-input');
    this.parkAllBtn = document.getElementById('tabs-park-all-btn');
    this.refreshBtn = document.getElementById('tabs-refresh-btn');

    this.isExtensionEnv = (typeof chrome !== 'undefined' && !!chrome.tabs && !!chrome.tabs.query);
    this.init();
  }

  init() {
    this.fetchTabs();
    this.bindEvents();

    // Real-time tab events from Chrome API
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      try {
        if (chrome.tabs.onCreated) chrome.tabs.onCreated.addListener(() => this.fetchTabs());
        if (chrome.tabs.onRemoved) chrome.tabs.onRemoved.addListener(() => this.fetchTabs());
        if (chrome.tabs.onUpdated) chrome.tabs.onUpdated.addListener(() => this.fetchTabs());
      } catch (e) {
        console.warn('Tabs event listeners error:', e);
      }
    }

    // Refresh when tab / window gains focus
    window.addEventListener('focus', () => this.fetchTabs());
  }

  fetchTabs() {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      this.isExtensionEnv = true;
      chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError) {
          console.warn('Tabs query error:', chrome.runtime.lastError);
          return;
        }
        this.tabs = tabs || [];
        this.updateBadge();
        if (this.drawerEl && this.drawerEl.classList.contains('open')) {
          this.render();
        }
      });
    } else {
      this.isExtensionEnv = false;
      // Mock preview when opened via file:// directly
      this.tabs = [
        { id: 101, title: 'GitHub - Repositories', url: 'https://github.com', favIconUrl: 'https://github.githubassets.com/favicons/favicon.png' },
        { id: 102, title: 'YouTube - Tech Trends', url: 'https://youtube.com', favIconUrl: 'https://www.youtube.com/s/desktop/favicon.ico' },
        { id: 103, title: 'ChatGPT', url: 'https://chatgpt.com', favIconUrl: 'https://chatgpt.com/favicon.ico' }
      ];
      this.updateBadge();
    }
  }

  updateBadge() {
    if (this.badgeEl) {
      this.badgeEl.textContent = this.tabs.length;
    }
  }

  switchToTab(tabId, windowId) {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.update) {
      chrome.tabs.update(tabId, { active: true }, () => {
        if (windowId && chrome.windows && chrome.windows.update) {
          chrome.windows.update(windowId, { focused: true });
        }
      });
    }
  }

  closeTab(tabId) {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.remove) {
      chrome.tabs.remove(tabId, () => {
        this.tabs = this.tabs.filter(t => t.id !== tabId);
        this.updateBadge();
        this.render();
      });
    } else {
      this.tabs = this.tabs.filter(t => t.id !== tabId);
      this.updateBadge();
      this.render();
    }
  }

  parkAllTabs() {
    if (!this.tabs.length) return;

    // Filter out internal chrome:// or newtab pages
    const validTabs = this.tabs.filter(t => t.url && !t.url.startsWith('chrome://') && !t.url.includes('newtab.html'));

    if (validTabs.length === 0) {
      alert('Park edilecek harici sekme bulunamadı.');
      return;
    }

    if (window.workspacesManager) {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const sessionTitle = `Park Edilen Sekmeler (${timeStr})`;

      const links = validTabs.map(t => ({
        title: t.title || t.url,
        url: t.url
      }));

      window.workspacesManager.addWorkspace(sessionTitle, links);

      // Close those tabs except current
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.remove) {
        chrome.tabs.getCurrent(currentTab => {
          const toRemove = validTabs
            .filter(t => !currentTab || t.id !== currentTab.id)
            .map(t => t.id);

          if (toRemove.length) {
            chrome.tabs.remove(toRemove, () => {
              this.fetchTabs();
              alert(`Harika! ${toRemove.length} sekme başarıyla park edildi ve hafıza boşaltıldı. Bu sekmelere "Çalışma Alanları" bölümünden dilediğiniz an ulaşabilirsiniz.`);
            });
          }
        });
      }
    }
  }

  render() {
    if (!this.listEl) return;
    this.listEl.innerHTML = '';

    if (!this.isExtensionEnv) {
      const banner = document.createElement('div');
      banner.style.cssText = 'background: rgba(139, 92, 246, 0.18); border: 1px solid var(--accent-purple); padding: 12px 14px; border-radius: 8px; margin-bottom: 12px; font-size: 12px; line-height: 1.5; color: #e2e8f0; text-align: left;';
      banner.innerHTML = '<strong>💡 Chrome Eklentisi Olarak Çalıştırın:</strong><br>Gerçek açık sekmelerinizi görebilmek için bu klasörü Chrome\'da <code>chrome://extensions/</code> sayfasından <strong>"Paketlenmemiş Öğe Yükle"</strong> ile ekleyin veya yenileyin (🔄). Doğrudan HTML dosyası olarak açıldığında Chrome sekmeler API\'si kısıtlanır.';
      this.listEl.appendChild(banner);
    }

    const filterQuery = (this.searchInput ? this.searchInput.value : '').toLowerCase().trim();

    const filtered = this.tabs.filter(t => {
      const title = (t.title || '').toLowerCase();
      const url = (t.url || '').toLowerCase();
      return title.includes(filterQuery) || url.includes(filterQuery);
    });

    if (filtered.length === 0) {
      this.listEl.innerHTML = `
        <li style="text-align:center; padding: 24px 0; color: var(--text-faint); font-size: 13px;">
          Eşleşen sekme bulunamadı.
        </li>
      `;
      return;
    }

    filtered.forEach(tab => {
      const li = document.createElement('li');
      li.className = 'tab-card-item';

      let domain = '';
      try {
        domain = new URL(tab.url).hostname;
      } catch (e) {
        domain = tab.url || '';
      }

      const faviconSrc = tab.favIconUrl || (domain ? NovaUtils.faviconUrl(tab.url) : '');

      const safeTitle = NovaUtils.escapeHtml(tab.title || 'Sekme');
      const safeDomain = NovaUtils.escapeHtml(domain);
      const safeFavicon = NovaUtils.escapeHtml(faviconSrc);

      li.innerHTML = `
        <div class="tab-card-main">
          ${safeFavicon ? `<img src="${safeFavicon}" alt="" class="tab-favicon">` : ''}
          <div class="tab-info">
            <span class="tab-title" title="${safeTitle}">${safeTitle}</span>
            <span class="tab-domain">${safeDomain}</span>
          </div>
        </div>
        <div class="tab-actions">
          <button class="icon-btn-subtle tab-goto-btn" title="Sekmeye Git">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </button>
          <button class="icon-btn-subtle tab-close-btn" title="Sekmeyi Kapat">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      `;

      // Favicon yüklenemezse sessizce gizle (CSP uyumlu, inline handler'sız)
      const tabFaviconImg = li.querySelector('.tab-favicon');
      if (tabFaviconImg) {
        tabFaviconImg.addEventListener('error', () => { tabFaviconImg.style.display = 'none'; });
      }

      // Switch to tab
      li.querySelector('.tab-card-main').addEventListener('click', () => {
        this.switchToTab(tab.id, tab.windowId);
      });
      li.querySelector('.tab-goto-btn').addEventListener('click', () => {
        this.switchToTab(tab.id, tab.windowId);
      });

      // Close tab
      li.querySelector('.tab-close-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTab(tab.id);
      });

      this.listEl.appendChild(li);
    });
  }

  bindEvents() {
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => {
        this.drawerEl.classList.toggle('open');
        if (this.drawerEl.classList.contains('open')) {
          this.fetchTabs();
          if (this.searchInput) this.searchInput.focus();
        }
      });
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => {
        this.drawerEl.classList.remove('open');
      });
    }

    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => this.render());
    }

    if (this.refreshBtn) {
      this.refreshBtn.addEventListener('click', () => this.fetchTabs());
    }

    if (this.parkAllBtn) {
      this.parkAllBtn.addEventListener('click', () => this.parkAllTabs());
    }
  }
}

window.tabsManager = new TabsManager();
