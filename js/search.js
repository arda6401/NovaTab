/**
 * Multi-Engine Search Manager
 * Supports Google, ChatGPT, Perplexity, YouTube, GitHub, DuckDuckGo
 * Smart direct-URL routing and keyboard shortcut '/'
 */

const SEARCH_ENGINES = {
  google: {
    name: 'Google',
    url: 'https://www.google.com/search?q=',
    placeholder: "Google'da ara veya bir bağlantı yaz..."
  },
  chatgpt: {
    name: 'ChatGPT',
    url: 'https://chatgpt.com/?q=',
    placeholder: "ChatGPT'ye bir soru sor veya prompt yaz..."
  },
  perplexity: {
    name: 'Perplexity',
    url: 'https://www.perplexity.ai/search?q=',
    placeholder: "Perplexity AI ile derinlemesine araştır..."
  },
  youtube: {
    name: 'YouTube',
    url: 'https://www.youtube.com/results?search_query=',
    placeholder: "YouTube'da video, müzik veya kanal ara..."
  },
  github: {
    name: 'GitHub',
    url: 'https://github.com/search?q=',
    placeholder: "GitHub'da repo, kod veya kullanıcı ara..."
  },
  duckduckgo: {
    name: 'DuckDuckGo',
    url: 'https://duckduckgo.com/?q=',
    placeholder: "DuckDuckGo ile gizli ara..."
  }
};

class SearchManager {
  constructor() {
    this.storageKey = 'nova_default_engine';
    this.currentEngine = 'google';

    this.formEl = document.getElementById('search-form');
    this.inputEl = document.getElementById('search-input');
    this.pillsContainer = document.getElementById('search-engines');

    this.init();
  }

  async init() {
    await this.loadSavedEngine();
    this.bindEvents();
  }

  async loadSavedEngine() {
    try {
      // Önce hızlı lokal cache, yoksa cihazlar arası senkron depo
      let saved = localStorage.getItem(this.storageKey);
      if (!saved && window.syncStorage) {
        saved = await window.syncStorage.get(this.storageKey, null);
      }
      if (saved && SEARCH_ENGINES[saved]) {
        this.setEngine(saved);
      }
    } catch (e) {
      this.setEngine('google');
    }
  }

  setEngine(engineKey) {
    if (!SEARCH_ENGINES[engineKey]) return;
    this.currentEngine = engineKey;

    // Update active pill UI
    document.querySelectorAll('.engine-pill').forEach(pill => {
      if (pill.dataset.engine === engineKey) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });

    // Update input placeholder
    if (this.inputEl) {
      this.inputEl.placeholder = SEARCH_ENGINES[engineKey].placeholder;
    }

    // Save preference
    try {
      localStorage.setItem(this.storageKey, engineKey);
    } catch (e) {}
    if (window.syncStorage) window.syncStorage.set(this.storageKey, engineKey);
  }

  isDirectUrl(str) {
    const trimmed = str.trim();
    if (/^https?:\/\//i.test(trimmed)) return true;
    if (/^localhost(:\d+)?/i.test(trimmed)) return true;
    // Standard domain pattern like something.com, something.org/path
    if (/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/i.test(trimmed)) return true;
    return false;
  }

  handleSearch(query) {
    const trimmed = query.trim();
    if (!trimmed) return;

    // Direct URL check
    if (this.isDirectUrl(trimmed)) {
      const targetUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      window.location.href = targetUrl;
      return;
    }

    // Multi-engine search redirection
    const engine = SEARCH_ENGINES[this.currentEngine] || SEARCH_ENGINES.google;
    const targetUrl = `${engine.url}${encodeURIComponent(trimmed)}`;
    window.location.href = targetUrl;
  }

  bindEvents() {
    // Engine pill clicks
    if (this.pillsContainer) {
      this.pillsContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.engine-pill');
        if (pill) {
          const engine = pill.dataset.engine;
          this.setEngine(engine);
          if (this.inputEl) this.inputEl.focus();
        }
      });
    }

    // Form submit
    if (this.formEl) {
      this.formEl.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSearch(this.inputEl.value);
      });
    }

    // Keyboard shortcut '/' to focus search input
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== this.inputEl && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        if (this.inputEl) {
          this.inputEl.focus();
          this.inputEl.select();
        }
      }
    });
  }
}

window.searchManager = new SearchManager();
