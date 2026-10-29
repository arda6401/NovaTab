/**
 * Privacy-First Screen Time & Tab Analytics
 * 100% locally stored on your machine. Zero servers, zero telemetry.
 */

class AnalyticsManager {
  constructor() {
    this.storageKey = 'nova_analytics_data';
    this.data = {
      date: new Date().toISOString().slice(0, 10),
      tabsOpenedToday: 0,
      activeSecondsToday: 0,
      domainUsage: {} // { "github.com": seconds }
    };

    this.drawerEl = document.getElementById('analytics-drawer');
    this.toggleBtn = document.getElementById('analytics-toggle-btn');
    this.closeBtn = document.getElementById('analytics-close-btn');
    this.screenTimeValEl = document.getElementById('analytics-screen-time');
    this.tabsCountValEl = document.getElementById('analytics-tabs-opened');
    this.domainListEl = document.getElementById('analytics-domain-list');
    this.resetBtn = document.getElementById('analytics-reset-btn');

    this.isTabActive = true;
    this.activeDomain = '';

    this.init();
  }

  async init() {
    await this.loadData();
    this.bindEvents();
    this.startTracking();
    this.render();
  }

  getTodayString() {
    return new Date().toISOString().slice(0, 10);
  }

  async loadData() {
    const today = this.getTodayString();
    let saved = null;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) saved = JSON.parse(raw);
    } catch (e) {}

    if (saved && saved.date === today) {
      this.data = saved;
    } else {
      // New day, reset stats
      this.data = {
        date: today,
        tabsOpenedToday: 0,
        activeSecondsToday: 0,
        domainUsage: {}
      };
      this.saveData();
    }
  }

  saveData() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (e) {}
  }

  startTracking() {
    // 1. Listen for new tabs opened
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.onCreated) {
      try {
        chrome.tabs.onCreated.addListener(() => {
          this.data.tabsOpenedToday++;
          this.saveData();
          this.render();
        });
      } catch (e) {}
    }

    // 2. Track active domain
    this.detectActiveDomain();
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.onActivated) {
      try {
        chrome.tabs.onActivated.addListener(() => this.detectActiveDomain());
      } catch (e) {}
    }

    // 3. Heartbeat counter for active seconds
    setInterval(() => {
      if (document.hasFocus() || this.isTabActive) {
        this.data.activeSecondsToday++;
        if (this.activeDomain) {
          this.data.domainUsage[this.activeDomain] = (this.data.domainUsage[this.activeDomain] || 0) + 1;
        }

        // Save periodically (every 10 seconds)
        if (this.data.activeSecondsToday % 10 === 0) {
          this.saveData();
        }

        if (this.drawerEl && this.drawerEl.classList.contains('open')) {
          this.render();
        }
      }
    }, 1000);

    window.addEventListener('focus', () => { this.isTabActive = true; this.detectActiveDomain(); });
    window.addEventListener('blur', () => { this.isTabActive = false; });
  }

  detectActiveDomain() {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].url) {
          try {
            const url = new URL(tabs[0].url);
            if (url.protocol.startsWith('http')) {
              this.activeDomain = url.hostname.replace(/^www\./, '');
            }
          } catch (e) {}
        }
      });
    }
  }

  formatSeconds(sec) {
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;

    if (hours > 0) return `${hours} sa ${mins} dk`;
    if (mins > 0) return `${mins} dk ${s} sn`;
    return `${s} saniye`;
  }

  render() {
    if (this.screenTimeValEl) {
      this.screenTimeValEl.textContent = this.formatSeconds(this.data.activeSecondsToday);
    }
    if (this.tabsCountValEl) {
      this.tabsCountValEl.textContent = `${this.data.tabsOpenedToday} Sekme`;
    }

    if (!this.domainListEl) return;
    this.domainListEl.innerHTML = '';

    const entries = Object.entries(this.data.domainUsage).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      this.domainListEl.innerHTML = `
        <div style="text-align:center; padding:24px 0; color:var(--text-faint); font-size:12.5px;">
          Henüz site kullanım verisi toplanmadı. Tarayıcıda gezinmeye devam ettikçe burada belirecektir.
        </div>
      `;
      return;
    }

    const totalSeconds = this.data.activeSecondsToday || 1;

    entries.slice(0, 6).forEach(([domain, sec]) => {
      const pct = Math.min(100, Math.round((sec / totalSeconds) * 100));
      const row = document.createElement('div');
      row.className = 'analytics-domain-row';

      const favicon = NovaUtils.faviconUrl(`https://${domain}`);

      row.innerHTML = `
        <div class="domain-info-line">
          <div class="domain-name-group">
            ${favicon ? `<img src="${favicon}" alt="" width="14" height="14">` : ''}
            <span>${NovaUtils.escapeHtml(domain)}</span>
          </div>
          <span class="domain-time-text">${this.formatSeconds(sec)} (%${pct})</span>
        </div>
        <div class="analytics-bar-bg">
          <div class="analytics-bar-fill" style="width: ${pct}%;"></div>
        </div>
      `;

      const faviconImg = row.querySelector('img');
      if (faviconImg) {
        faviconImg.addEventListener('error', () => { faviconImg.style.display = 'none'; });
      }

      this.domainListEl.appendChild(row);
    });
  }

  resetData() {
    if (confirm('Bugünkü istatistikleri sıfırlamak istediğinize emin misiniz?')) {
      this.data.tabsOpenedToday = 0;
      this.data.activeSecondsToday = 0;
      this.data.domainUsage = {};
      this.saveData();
      this.render();
    }
  }

  bindEvents() {
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => {
        this.drawerEl.classList.toggle('open');
        if (this.drawerEl.classList.contains('open')) {
          this.render();
        }
      });
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => {
        this.drawerEl.classList.remove('open');
      });
    }

    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => this.resetData());
    }
  }
}

window.analyticsManager = new AnalyticsManager();
