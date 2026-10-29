/**
 * Nova Tab v4.0 - Main Application Orchestrator
 * Clock, Greeting, Instant Background Switching (incl. Interactive Canvas),
 * Settings, Cloud Sync, Weather City Preferences, Radar & Analytics Toggles,
 * Pinterest, Local Media Upload, Background Adjustments (Blur, Zoom, Rotate, Pan)
 */

const VIDEO_THEMES = {
  'video-lofi': 'https://assets.mixkit.co/videos/preview/mixkit-cozy-living-room-with-a-fireplace-42998-large.mp4',
  'video-rain': 'https://assets.mixkit.co/videos/preview/mixkit-rain-drops-falling-on-the-window-glass-41487-large.mp4',
  'video-cyber': 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-with-flying-cars-and-skyscrapers-41712-large.mp4'
};

class NovaApp {
  constructor() {
    this.settingsKey = 'nova_settings';
    this.settings = {
      username: 'Arda',
      showSeconds: false,
      use12Hour: false,
      theme: 'gradient-1',
      palette: 'purple',
      customColor: '#8b5cf6',
      glass: 'medium',
      motion: 'fluid',
      radius: 'medium',
      customBg: '',
      bgAdjust: {
        blur: 0,
        zoom: 100,
        rotate: 0,
        shiftX: 0,
        shiftY: 0
      },
      weatherAuto: true,
      weatherCity: '',
      widgets: {
        finance: true,
        weather: true,
        shortcuts: true,
        quote: true,
        notes: true,
        todo: true,
        radar: true,
        analytics: true
      },
      // Widget konumları: { widgetId: {x, y} } yüzde (merkez noktası) — LayoutManager yönetir
      layout: {}
    };

    // DOM Elements
    this.clockEl = document.getElementById('clock');
    this.dateEl = document.getElementById('date-display');
    this.greetingEl = document.getElementById('greeting');
    this.videoEl = document.getElementById('bg-video');
    this.bgImageLayer = document.getElementById('bg-image-layer');

    // Settings Modal Elements
    this.settingsBtn = document.getElementById('settings-btn');
    this.settingsModal = document.getElementById('settings-modal');
    this.settingsCloseBtn = document.getElementById('settings-close-btn');
    this.settingsSaveBtn = document.getElementById('settings-save-btn');
    this.usernameInput = document.getElementById('setting-username');
    this.secondsCheckbox = document.getElementById('setting-seconds');
    this.is12hCheckbox = document.getElementById('setting-12h');
    this.customBgInput = document.getElementById('setting-custom-bg');
    this.customBgClearBtn = document.getElementById('setting-custom-bg-clear');
    this.localFileInput = document.getElementById('setting-local-file');
    this.localFileStatus = document.getElementById('local-file-status');

    // v4 Arka Plan İnce Ayar Kontrol Elementleri
    this.sliderBgBlur = document.getElementById('setting-bg-blur');
    this.sliderBgZoom = document.getElementById('setting-bg-zoom');
    this.sliderBgRotate = document.getElementById('setting-bg-rotate');
    this.sliderBgShiftX = document.getElementById('setting-bg-shift-x');
    this.sliderBgShiftY = document.getElementById('setting-bg-shift-y');
    this.valBgBlur = document.getElementById('val-bg-blur');
    this.valBgZoom = document.getElementById('val-bg-zoom');
    this.valBgRotate = document.getElementById('val-bg-rotate');
    this.valBgShiftX = document.getElementById('val-bg-shift-x');
    this.valBgShiftY = document.getElementById('val-bg-shift-y');
    this.bgAdjustResetBtn = document.getElementById('bg-adjust-reset');

    // v4.5 Preview Elements
    this.previewLayer = document.getElementById('bg-preview-layer');
    this.previewVideo = document.getElementById('bg-preview-video');
    this.previewClock = document.querySelector('.preview-clock');

    // Widget Toggles
    this.toggleFinance = document.getElementById('toggle-finance');
    this.toggleWeather = document.getElementById('toggle-weather');
    this.toggleShortcuts = document.getElementById('toggle-shortcuts');
    this.toggleQuote = document.getElementById('toggle-quote');
    this.toggleNotesBtn = document.getElementById('toggle-notes-btn');
    this.toggleTodoBtn = document.getElementById('toggle-todo-btn');

    // v5 Layout Manager
    if (window.LayoutManager) {
      this.layoutManager = new window.LayoutManager(this);
    }

    this.init();
  }

  async init() {
    await this.loadSettings();
    if (this.layoutManager) {
      this.layoutManager.applyLayout(this.settings.layout);
    }
    this.applySettings();
    this.startClock();
    this.startPreviewClock();
    this.bindEvents();
  }

  async loadSettings() {
    if (window.syncStorage) {
      const saved = await window.syncStorage.get(this.settingsKey, null);
      if (saved) {
        this.settings = {
          ...this.settings,
          ...saved,
          bgAdjust: { ...this.settings.bgAdjust, ...(saved.bgAdjust || {}) },
          widgets: { ...this.settings.widgets, ...(saved.widgets || {}) },
          layout: { ...this.settings.layout, ...(saved.layout || {}) }
        };
      }
    } else {
      try {
        const saved = localStorage.getItem(this.settingsKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          this.settings = {
            ...this.settings,
            ...parsed,
            bgAdjust: { ...this.settings.bgAdjust, ...(parsed.bgAdjust || {}) },
            widgets: { ...this.settings.widgets, ...(parsed.widgets || {}) },
            layout: { ...this.settings.layout, ...(parsed.layout || {}) }
          };
        }
      } catch (e) {}
    }
  }

  async saveSettings() {
    if (window.syncStorage) {
      await window.syncStorage.set(this.settingsKey, this.settings);
    } else {
      try {
        localStorage.setItem(this.settingsKey, JSON.stringify(this.settings));
      } catch (e) {}
    }
    this.applySettings();
  }

  async applyBackground() {
    let customBg = (this.settings.customBg || '').trim();

    // Always stop interactive canvas first; re-enable below if needed
    if (window.interactiveBg) window.interactiveBg.stop();

    // Check if custom background is a local file saved in IndexedDB
    if (customBg === 'local_file_saved') {
      try {
        const localData = await this.getLocalFileBackground();
        if (localData && localData.data) {
          if (localData.type && localData.type.startsWith('video/')) {
            this.stopImageBackground();
            this.playVideoBackground(localData.data);
            document.body.className = '';
            document.body.style.backgroundImage = '';
            this.updatePreviewSource('video', localData.data);
            this.applyBackgroundTransforms();
            return;
          } else {
            this.stopVideoBackground();
            document.body.className = '';
            document.body.style.backgroundImage = '';
            this.showImageBackground(localData.data);
            this.updatePreviewSource('image', localData.data);
            this.applyBackgroundTransforms();
            return;
          }
        }
      } catch (err) {
        console.warn('Could not load local background file:', err);
      }
    }

    // Resolve Pinterest or external links
    if (customBg) {
      customBg = this.normalizeCustomBackgroundUrl(customBg);
    }

    const isVideo = customBg.endsWith('.mp4') || customBg.endsWith('.webm') || customBg.endsWith('.ogg') ||
                    customBg.includes('.mp4?') || customBg.startsWith('data:video/') ||
                    (customBg.startsWith('blob:') && customBg.includes('video'));

    if (isVideo) {
      this.stopImageBackground();
      this.playVideoBackground(customBg);
      document.body.className = '';
      document.body.style.backgroundImage = '';
      this.updatePreviewSource('video', customBg);
      this.applyBackgroundTransforms();
      return;
    }

    if (customBg) {
      this.stopVideoBackground();
      document.body.className = '';
      document.body.style.backgroundImage = '';
      this.showImageBackground(customBg);
      this.updatePreviewSource('image', customBg);
      this.applyBackgroundTransforms();
      return;
    }

    // Preset theme
    this.stopImageBackground();
    this.stopVideoBackground();
    document.body.style.backgroundImage = '';
    document.body.className = `theme-${this.settings.theme}`;

    if (this.settings.theme === 'nature') {
      const natureUrl = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=90&w=3840&auto=format&fit=crop";
      this.showImageBackground(natureUrl);
      this.updatePreviewSource('image', natureUrl);
      this.applyBackgroundTransforms();
      return;
    }

    if (this.settings.theme === 'interactive') {
      if (window.interactiveBg) window.interactiveBg.start();
      this.updatePreviewSource('gradient', null);
      this.applyBackgroundTransforms();
      return;
    }

    if (VIDEO_THEMES[this.settings.theme]) {
      const vUrl = VIDEO_THEMES[this.settings.theme];
      this.playVideoBackground(vUrl);
      this.updatePreviewSource('video', vUrl);
      this.applyBackgroundTransforms();
      return;
    }

    // Static gradient themes
    this.updatePreviewSource('gradient', null);
    this.applyBackgroundTransforms();
  }

  showImageBackground(url) {
    if (!this.bgImageLayer) this.bgImageLayer = document.getElementById('bg-image-layer');
    if (this.bgImageLayer) {
      this.bgImageLayer.style.backgroundImage = `url('${url}')`;
      this.bgImageLayer.classList.add('active');
    }
  }

  stopImageBackground() {
    if (!this.bgImageLayer) this.bgImageLayer = document.getElementById('bg-image-layer');
    if (this.bgImageLayer) {
      this.bgImageLayer.classList.remove('active');
      this.bgImageLayer.style.backgroundImage = '';
    }
  }

  applyBackgroundTransforms() {
    const adj = this.settings.bgAdjust || { blur: 0, zoom: 100, rotate: 0, shiftX: 0, shiftY: 0 };
    const blur = adj.blur || 0;
    const zoom = (adj.zoom !== undefined ? adj.zoom : 100) / 100;
    const rotate = adj.rotate || 0;
    const shiftX = adj.shiftX || 0;
    const shiftY = adj.shiftY || 0;

    // If default values (no zoom, rotate, shift), clear transform so GPU renders native 1:1 pixel-perfect sharp image
    const isDefaultTransform = (zoom === 1 && rotate === 0 && shiftX === 0 && shiftY === 0);
    const transformStr = isDefaultTransform ? 'none' : `translate(${shiftX}%, ${shiftY}%) scale(${zoom}) rotate(${rotate}deg)`;
    const filterStr = blur > 0 ? `blur(${blur}px)` : 'none';

    if (this.bgImageLayer) {
      this.bgImageLayer.style.transform = transformStr;
      this.bgImageLayer.style.filter = filterStr;
    }

    if (this.videoEl) {
      this.videoEl.style.transform = transformStr;
      this.videoEl.style.filter = filterStr;
    }

    // ── v4.5: sync preview ──
    // Preview blur is scaled down proportionally (preview ~15% of screen width)
    const previewBlur = blur > 0 ? Math.round(blur * 0.18 * 10) / 10 : 0;
    const previewFilterStr = previewBlur > 0 ? `blur(${previewBlur}px)` : 'none';
    if (this.previewLayer) {
      this.previewLayer.style.transform = transformStr;
      this.previewLayer.style.filter = previewFilterStr;
    }
    if (this.previewVideo) {
      this.previewVideo.style.transform = transformStr;
      this.previewVideo.style.filter = previewFilterStr;
    }
  }

  // v4.5: set the preview source to mirror the active background
  updatePreviewSource(type, src) {
    if (!this.previewLayer || !this.previewVideo) return;

    if (type === 'image') {
      this.previewLayer.style.backgroundImage = src ? `url('${src}')` : '';
      this.previewVideo.style.display = 'none';
      this.previewVideo.pause();
      this.previewVideo.src = '';
    } else if (type === 'video') {
      this.previewLayer.style.backgroundImage = '';
      this.previewVideo.style.display = 'block';
      if (this.previewVideo.src !== src) {
        this.previewVideo.src = src;
        this.previewVideo.load();
      }
      this.previewVideo.play().catch(() => {});
    } else {
      // gradient / interactive
      this.previewLayer.style.backgroundImage = '';
      this.previewVideo.style.display = 'none';
      this.previewVideo.pause();
      this.previewVideo.src = '';
    }
  }

  // v4.5: keep preview clock ticking only when settings modal is open or active
  startPreviewClock() {
    const tick = () => {
      // Only tick if settings modal is actually open and document is visible
      if (document.hidden) return;
      if (!this.settingsModal || !this.settingsModal.classList.contains('open')) return;

      if (this.previewClock) {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        this.previewClock.textContent = `${h}:${m}`;
      }
    };
    if (this._previewInterval) clearInterval(this._previewInterval);
    this._previewInterval = setInterval(tick, 10000);
  }


  normalizeCustomBackgroundUrl(url) {
    if (!url) return '';
    let trimmed = url.trim();

    // Pinterest direct image link handler (upgrade thumbnails to original high-res)
    // E.g. i.pinimg.com/236x/..., /474x/..., /736x/... -> /originals/
    if (trimmed.includes('i.pinimg.com/')) {
      trimmed = trimmed.replace(/\/([0-9]{3,4}x)\//g, '/originals/');
      return trimmed;
    }

    // Pinterest Pin page link handler
    const pinMatch = trimmed.match(/pinterest\.[a-z.]+\/pin\/(\d+)/i);
    if (pinMatch && pinMatch[1]) {
      return trimmed;
    }

    // Unsplash direct photo URL without direct image params (request 4K resolution)
    if (trimmed.includes('unsplash.com/photos/')) {
      const parts = trimmed.split('photos/');
      const photoId = parts[1] ? parts[1].split('?')[0] : '';
      if (photoId) {
        return `https://images.unsplash.com/photo-${photoId}?q=90&w=3840&auto=format&fit=crop`;
      }
    }

    // If Unsplash image URL with existing params, upgrade quality & width
    if (trimmed.includes('images.unsplash.com/')) {
      if (!trimmed.includes('w=')) {
        trimmed += (trimmed.includes('?') ? '&' : '?') + 'q=90&w=3840&auto=format&fit=crop';
      }
    }

    return trimmed;
  }

  // --- IndexedDB for Large Local Wallpaper / Video Storage ---
  openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('nova_media_db', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('wallpapers')) {
          db.createObjectStore('wallpapers', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async saveLocalFileBackground(fileOrData, fileType, fileName) {
    try {
      const db = await this.openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('wallpapers', 'readwrite');
        const store = tx.objectStore('wallpapers');
        store.put({ id: 'active_local_bg', data: fileOrData, type: fileType, name: fileName, timestamp: Date.now() });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('IndexedDB save error, fallback to localStorage:', e);
      try {
        if (typeof fileOrData === 'string') {
          localStorage.setItem('nova_local_bg_data', fileOrData);
          localStorage.setItem('nova_local_bg_type', fileType);
        }
      } catch (err) {}
    }
  }

  async getLocalFileBackground() {
    try {
      const db = await this.openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('wallpapers', 'readonly');
        const store = tx.objectStore('wallpapers');
        const req = store.get('active_local_bg');
        req.onsuccess = () => {
          const res = req.result;
          if (!res) return resolve(null);
          // If stored as raw Blob or File, generate a direct, lossless, high-performance Object URL
          if (res.data instanceof Blob || res.data instanceof File) {
            if (this._activeBlobUrl) {
              try { URL.revokeObjectURL(this._activeBlobUrl); } catch(e) {}
            }
            this._activeBlobUrl = URL.createObjectURL(res.data);
            return resolve({ ...res, data: this._activeBlobUrl });
          }
          resolve(res);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      const data = localStorage.getItem('nova_local_bg_data');
      const type = localStorage.getItem('nova_local_bg_type');
      if (data) return { data, type };
      return null;
    }
  }

  async clearLocalFileBackground() {
    if (this._activeBlobUrl) {
      try { URL.revokeObjectURL(this._activeBlobUrl); } catch(e) {}
      this._activeBlobUrl = null;
    }
    try {
      const db = await this.openDb();
      const tx = db.transaction('wallpapers', 'readwrite');
      tx.objectStore('wallpapers').delete('active_local_bg');
    } catch (e) {}
    localStorage.removeItem('nova_local_bg_data');
    localStorage.removeItem('nova_local_bg_type');
  }

  playVideoBackground(videoUrl) {
    if (!this.videoEl) return;
    if (this.videoEl.src !== videoUrl) {
      this.videoEl.src = videoUrl;
      this.videoEl.load();
    }
    this.videoEl.style.display = 'block';
    this.videoEl.play().then(() => {
      this.videoEl.classList.add('active');
    }).catch(err => {
      console.warn('Video background fallback to animated CSS:', err);
      this.stopVideoBackground();
    });
  }

  stopVideoBackground() {
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.classList.remove('active');
      this.videoEl.style.display = 'none';
      this.videoEl.src = '';
    }
  }

  applyDesignAndMotion() {
    const palette = this.settings.palette || 'purple';
    const PALETTES = {
      purple:  { p: '#8b5cf6', s: '#38bdf8' },
      emerald: { p: '#10b981', s: '#06b6d4' },
      azure:   { p: '#0284c7', s: '#38bdf8' },
      rose:    { p: '#f43f5e', s: '#fb923c' },
      gold:    { p: '#f59e0b', s: '#fbbf24' },
      mono:    { p: '#f1f5f9', s: '#94a3b8' }
    };

    let colP = '#8b5cf6';
    let colS = '#38bdf8';

    if (palette === 'custom' && this.settings.customColor) {
      colP = this.settings.customColor;
      colS = this.settings.customColor;
    } else if (PALETTES[palette]) {
      colP = PALETTES[palette].p;
      colS = PALETTES[palette].s;
    }

    const root = document.documentElement;
    root.style.setProperty('--accent-purple', colP);
    root.style.setProperty('--accent-blue', colS);
    root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${colP} 0%, ${colS} 100%)`);
    root.style.setProperty('--glass-border-focus', `${colP}80`);

    // Glass opacity & blur
    const glass = this.settings.glass || 'medium';
    if (glass === 'low') {
      root.style.setProperty('--glass-bg', 'rgba(15, 18, 30, 0.40)');
      root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.08)');
      root.style.setProperty('--glass-blur', '14px');
    } else if (glass === 'solid') {
      root.style.setProperty('--glass-bg', 'rgba(10, 12, 22, 0.92)');
      root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.16)');
      root.style.setProperty('--glass-blur', '30px');
    } else {
      root.style.setProperty('--glass-bg', 'rgba(20, 24, 40, 0.65)');
      root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.12)');
      root.style.setProperty('--glass-blur', '20px');
    }

    // Motion style
    const motion = this.settings.motion || 'fluid';
    root.setAttribute('data-motion', motion);
    document.body.setAttribute('data-motion', motion);

    // Border radius
    const radius = this.settings.radius || 'medium';
    if (radius === 'rounded') {
      root.style.setProperty('--radius-md', '20px');
      root.style.setProperty('--radius-lg', '28px');
    } else if (radius === 'sharp') {
      root.style.setProperty('--radius-md', '6px');
      root.style.setProperty('--radius-lg', '10px');
    } else {
      root.style.setProperty('--radius-md', '14px');
      root.style.setProperty('--radius-lg', '22px');
    }
  }

  applySettings() {
    this.applyBackground();
    this.applyDesignAndMotion();

    // Widget Visibility
    const ids = {
      'finance-widget':       { key: 'finance',    display: 'flex' },
      'weather-widget':       { key: 'weather',    display: 'flex' },
      'shortcuts-section':    { key: 'shortcuts',  display: 'block' },
      'quote-widget':         { key: 'quote',      display: 'flex' },
      'notes-toggle-btn':     { key: 'notes',      display: 'inline-flex' },
      'todo-toggle-btn':      { key: 'todo',       display: 'inline-flex' },
      'radar-widget':         { key: 'radar',      display: 'flex' },
      'analytics-toggle-btn': { key: 'analytics',  display: 'inline-flex' }
    };

    for (const [id, cfg] of Object.entries(ids)) {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = (this.settings.widgets[cfg.key] !== false) ? cfg.display : 'none';
      }
    }

    this.updateGreeting();
    this.updateClock();
  }

  startClock() {
    this.updateClock();
    if (this._clockInterval) clearInterval(this._clockInterval);
    this._clockInterval = setInterval(() => {
      if (!document.hidden) {
        this.updateClock();
      }
    }, 1000);
  }

  updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    let ampm = '';

    if (this.settings.use12Hour) {
      ampm = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
    }

    const hoursStr = String(hours).padStart(2, '0');

    if (this.clockEl) {
      if (this.settings.showSeconds) {
        this.clockEl.textContent = `${hoursStr}:${minutes}:${seconds}${ampm}`;
      } else {
        this.clockEl.textContent = `${hoursStr}:${minutes}${ampm}`;
      }
    }

    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const dateNum = now.getDate();
    const year = now.getFullYear();

    if (this.dateEl) {
      this.dateEl.textContent = `${dateNum} ${monthName} ${year}, ${dayName}`;
    }
  }

  updateGreeting() {
    const hour = new Date().getHours();
    let timeGreeting = 'İyi günler';

    if (hour >= 5 && hour < 12) {
      timeGreeting = 'Günaydın';
    } else if (hour >= 12 && hour < 18) {
      timeGreeting = 'İyi günler';
    } else if (hour >= 18 && hour < 23) {
      timeGreeting = 'İyi akşamlar';
    } else {
      timeGreeting = 'İyi geceler';
    }

    const name = (this.settings.username || '').trim();
    if (this.greetingEl) {
      this.greetingEl.textContent = name ? `${timeGreeting}, ${name}` : timeGreeting;
    }
  }

  populateSettingsModal() {
    if (this.usernameInput) this.usernameInput.value = this.settings.username || '';
    if (this.secondsCheckbox) this.secondsCheckbox.checked = !!this.settings.showSeconds;
    if (this.is12hCheckbox) this.is12hCheckbox.checked = !!this.settings.use12Hour;
    if (this.customBgInput) {
      if (this.settings.customBg === 'local_file_saved') {
        this.customBgInput.value = '[Bilgisayardan Yüklenen Dosya]';
      } else {
        this.customBgInput.value = this.settings.customBg || '';
      }
    }

    // Widget toggles
    const toggleMap = NovaApp.WIDGET_TOGGLE_IDS;
    for (const [id, key] of Object.entries(toggleMap)) {
      const el = document.getElementById(id);
      if (el) el.checked = (this.settings.widgets[key] !== false);
    }

    // Weather city settings
    const weatherAutoCheck = document.getElementById('setting-weather-auto');
    const weatherCityInput = document.getElementById('setting-weather-city');
    if (weatherAutoCheck) {
      weatherAutoCheck.checked = (this.settings.weatherAuto !== false);
      if (weatherCityInput) weatherCityInput.disabled = weatherAutoCheck.checked;
    }
    if (weatherCityInput) weatherCityInput.value = this.settings.weatherCity || '';

    // v4 Arka Plan İnce Ayar Kontrolleri (Sliders)
    const adj = this.settings.bgAdjust || { blur: 0, zoom: 100, rotate: 0, shiftX: 0, shiftY: 0 };
    if (this.sliderBgBlur) this.sliderBgBlur.value = adj.blur || 0;
    if (this.valBgBlur) this.valBgBlur.textContent = `${adj.blur || 0}px`;

    if (this.sliderBgZoom) this.sliderBgZoom.value = (adj.zoom !== undefined ? adj.zoom : 100);
    if (this.valBgZoom) this.valBgZoom.textContent = `${adj.zoom !== undefined ? adj.zoom : 100}%`;

    if (this.sliderBgRotate) this.sliderBgRotate.value = adj.rotate || 0;
    if (this.valBgRotate) this.valBgRotate.textContent = `${adj.rotate || 0}°`;

    if (this.sliderBgShiftX) this.sliderBgShiftX.value = adj.shiftX || 0;
    if (this.valBgShiftX) this.valBgShiftX.textContent = `${adj.shiftX || 0}%`;

    if (this.sliderBgShiftY) this.sliderBgShiftY.value = adj.shiftY || 0;
    if (this.valBgShiftY) this.valBgShiftY.textContent = `${adj.shiftY || 0}%`;

    // Theme preset active state
    document.querySelectorAll('.preset-btn').forEach(btn => {
      if (btn.dataset.theme === this.settings.theme && !this.settings.customBg) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Color Palette active state
    const currentPalette = this.settings.palette || 'purple';
    document.querySelectorAll('.color-palette-btn').forEach(btn => {
      if (btn.dataset.palette === currentPalette) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const customColorInput = document.getElementById('setting-custom-color');
    const customColorPreview = document.getElementById('custom-color-preview');
    if (customColorInput) {
      customColorInput.value = this.settings.customColor || '#8b5cf6';
      if (currentPalette === 'custom' && customColorPreview) {
        customColorPreview.style.background = this.settings.customColor;
        const customBtn = document.querySelector('.custom-color-btn');
        if (customBtn) customBtn.classList.add('active');
      }
    }

    // Segmented Controls active state
    const setSegmentedActive = (containerId, attr, val) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.querySelectorAll('.segmented-btn').forEach(btn => {
        if (btn.getAttribute(attr) === val) btn.classList.add('active');
        else btn.classList.remove('active');
      });
    };

    setSegmentedActive('glass-opacity-selector', 'data-glass', this.settings.glass || 'medium');
    setSegmentedActive('motion-style-selector', 'data-motion', this.settings.motion || 'fluid');
    setSegmentedActive('radius-style-selector', 'data-radius', this.settings.radius || 'medium');
  }

  saveSettingsFromModal() {
    if (this.usernameInput) this.settings.username = this.usernameInput.value.trim();
    if (this.secondsCheckbox) this.settings.showSeconds = this.secondsCheckbox.checked;
    if (this.is12hCheckbox) this.settings.use12Hour = this.is12hCheckbox.checked;
    if (this.customBgInput) {
      const val = this.customBgInput.value.trim();
      if (!val.startsWith('[') && !val.endsWith(']')) {
        this.settings.customBg = val;
      }
    }

    // Widget toggles
    const toggleMap = NovaApp.WIDGET_TOGGLE_IDS;
    const widgets = {};
    for (const [id, key] of Object.entries(toggleMap)) {
      const el = document.getElementById(id);
      widgets[key] = el ? el.checked : true;
    }
    this.settings.widgets = widgets;

    // Weather city settings
    const weatherAutoCheck = document.getElementById('setting-weather-auto');
    const weatherCityInput = document.getElementById('setting-weather-city');
    if (weatherAutoCheck) this.settings.weatherAuto = weatherAutoCheck.checked;
    if (weatherCityInput) this.settings.weatherCity = weatherCityInput.value.trim();

    // Manuel/otomatik hava durumu şehir tercihini WeatherManager'a anında uygula
    if (window.weatherManager && typeof window.weatherManager.setCityPreference === 'function') {
      window.weatherManager.setCityPreference(this.settings.weatherAuto !== false, this.settings.weatherCity);
    }

    // v4 Arka Plan İnce Ayarları
    this.settings.bgAdjust = {
      blur: this.sliderBgBlur ? parseInt(this.sliderBgBlur.value, 10) || 0 : 0,
      zoom: this.sliderBgZoom ? parseInt(this.sliderBgZoom.value, 10) || 100 : 100,
      rotate: this.sliderBgRotate ? parseInt(this.sliderBgRotate.value, 10) || 0 : 0,
      shiftX: this.sliderBgShiftX ? parseInt(this.sliderBgShiftX.value, 10) || 0 : 0,
      shiftY: this.sliderBgShiftY ? parseInt(this.sliderBgShiftY.value, 10) || 0 : 0
    };

    // Apply immediate transform
    this.applyBackgroundTransforms();

    this.saveSettings();
    this.closeSettingsModal();
  }

  openSettingsModal() {
    this.populateSettingsModal();
    if (this.settingsModal) this.settingsModal.classList.add('open');
  }

  closeSettingsModal() {
    if (this.settingsModal) this.settingsModal.classList.remove('open');
  }

  bindEvents() {
    // Settings Modal open/close
    if (this.settingsBtn) {
      this.settingsBtn.addEventListener('click', () => this.openSettingsModal());
    }
    if (this.settingsCloseBtn) {
      this.settingsCloseBtn.addEventListener('click', () => this.closeSettingsModal());
    }
    if (this.settingsModal) {
      this.settingsModal.addEventListener('click', (e) => {
        if (e.target === this.settingsModal) this.closeSettingsModal();
      });
    }
    if (this.settingsSaveBtn) {
      this.settingsSaveBtn.addEventListener('click', () => this.saveSettingsFromModal());
    }

    // Live greeting preview while typing name in settings
    if (this.usernameInput) {
      this.usernameInput.addEventListener('input', () => {
        this.settings.username = this.usernameInput.value.trim();
        this.updateGreeting();
      });
    }

    // Weather auto toggle disables manual city input
    const weatherAutoCheck = document.getElementById('setting-weather-auto');
    const weatherCityInput = document.getElementById('setting-weather-city');
    if (weatherAutoCheck && weatherCityInput) {
      weatherAutoCheck.addEventListener('change', () => {
        weatherCityInput.disabled = weatherAutoCheck.checked;
      });
    }

    // Theme Preset Buttons — instant preview & persist
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const theme = e.currentTarget.dataset.theme;
        this.settings.theme = theme;
        this.settings.customBg = '';
        if (this.customBgInput) this.customBgInput.value = '';

        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        this.applyBackground();
        this.saveSettings();
      });
    });

    // Custom Background Input — live preview on change
    if (this.customBgInput) {
      this.customBgInput.addEventListener('change', () => {
        this.settings.customBg = this.customBgInput.value.trim();
        this.applyBackground();
      });
    }

    // Custom Background Clear Button
    if (this.customBgClearBtn) {
      this.customBgClearBtn.addEventListener('click', async () => {
        if (this.customBgInput) this.customBgInput.value = '';
        if (this.localFileStatus) this.localFileStatus.textContent = '';
        this.settings.customBg = '';
        await this.clearLocalFileBackground();
        this.applyBackground();
        this.saveSettings();
      });
    }

    // Local File Upload (Images & Videos)
    if (this.localFileInput) {
      this.localFileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (this.localFileStatus) {
          this.localFileStatus.textContent = `Kaydediliyor: ${file.name}...`;
        }

        try {
          // Store raw File directly in IndexedDB for 100% original quality, zero compression, and fast load
          await this.saveLocalFileBackground(file, file.type, file.name);
          this.settings.customBg = 'local_file_saved';
          if (this.customBgInput) this.customBgInput.value = `[Yerel Dosya: ${file.name}]`;
          if (this.localFileStatus) {
            this.localFileStatus.textContent = `✓ ${file.name} (Orijinal Kalite) yüklendi!`;
          }
          await this.applyBackground();
          await this.saveSettings();
        } catch (err) {
          console.error('Local file save error:', err);
          if (this.localFileStatus) this.localFileStatus.textContent = 'Hata: Dosya kaydedilemedi.';
        }
      });
    }

    // v4 Arka Plan İnce Ayar Slider Canlı Dinleyicileri
    const updateBgRealTime = () => {
      this.settings.bgAdjust = {
        blur: this.sliderBgBlur ? parseInt(this.sliderBgBlur.value, 10) || 0 : 0,
        zoom: this.sliderBgZoom ? parseInt(this.sliderBgZoom.value, 10) || 100 : 100,
        rotate: this.sliderBgRotate ? parseInt(this.sliderBgRotate.value, 10) || 0 : 0,
        shiftX: this.sliderBgShiftX ? parseInt(this.sliderBgShiftX.value, 10) || 0 : 0,
        shiftY: this.sliderBgShiftY ? parseInt(this.sliderBgShiftY.value, 10) || 0 : 0
      };
      if (this.valBgBlur) this.valBgBlur.textContent = `${this.settings.bgAdjust.blur}px`;
      if (this.valBgZoom) this.valBgZoom.textContent = `${this.settings.bgAdjust.zoom}%`;
      if (this.valBgRotate) this.valBgRotate.textContent = `${this.settings.bgAdjust.rotate}°`;
      if (this.valBgShiftX) this.valBgShiftX.textContent = `${this.settings.bgAdjust.shiftX}%`;
      if (this.valBgShiftY) this.valBgShiftY.textContent = `${this.settings.bgAdjust.shiftY}%`;

      this.applyBackgroundTransforms();
    };

    [this.sliderBgBlur, this.sliderBgZoom, this.sliderBgRotate, this.sliderBgShiftX, this.sliderBgShiftY].forEach(slider => {
      if (slider) {
        slider.addEventListener('input', updateBgRealTime);
        slider.addEventListener('change', () => this.saveSettings());
      }
    });

    // Reset Background Adjustments
    if (this.bgAdjustResetBtn) {
      this.bgAdjustResetBtn.addEventListener('click', () => {
        this.settings.bgAdjust = { blur: 0, zoom: 100, rotate: 0, shiftX: 0, shiftY: 0 };
        if (this.sliderBgBlur) this.sliderBgBlur.value = 0;
        if (this.sliderBgZoom) this.sliderBgZoom.value = 100;
        if (this.sliderBgRotate) this.sliderBgRotate.value = 0;
        if (this.sliderBgShiftX) this.sliderBgShiftX.value = 0;
        if (this.sliderBgShiftY) this.sliderBgShiftY.value = 0;
        if (this.valBgBlur) this.valBgBlur.textContent = '0px';
        if (this.valBgZoom) this.valBgZoom.textContent = '100%';
        if (this.valBgRotate) this.valBgRotate.textContent = '0°';
        if (this.valBgShiftX) this.valBgShiftX.textContent = '0%';
        if (this.valBgShiftY) this.valBgShiftY.textContent = '0%';

        this.applyBackgroundTransforms();
        this.saveSettings();
      });
    }

    // v5.5 Open Drag & Drop Layout Edit Mode (from settings modal)
    const openLayoutBtn = document.getElementById('open-layout-editor-btn');
    if (openLayoutBtn) {
      openLayoutBtn.addEventListener('click', () => {
        this.closeSettingsModal();
        if (this.layoutManager) {
          this.layoutManager.enterEditMode();
        }
      });
    }

    // ── Design Customization: Color Palette, Glass & Motion Handlers ──
    const paletteContainer = document.getElementById('color-palette-presets');
    if (paletteContainer) {
      paletteContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.color-palette-btn');
        if (!btn || btn.classList.contains('custom-color-btn')) return;
        const pal = btn.dataset.palette;
        if (!pal) return;

        paletteContainer.querySelectorAll('.color-palette-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        this.settings.palette = pal;
        this.applyDesignAndMotion();
        this.saveSettings();
      });
    }

    // Custom Color Picker input
    const customColorInput = document.getElementById('setting-custom-color');
    const customColorPreview = document.getElementById('custom-color-preview');
    if (customColorInput) {
      customColorInput.addEventListener('input', (e) => {
        const hex = e.target.value;
        this.settings.palette = 'custom';
        this.settings.customColor = hex;
        if (customColorPreview) customColorPreview.style.background = hex;
        if (paletteContainer) {
          paletteContainer.querySelectorAll('.color-palette-btn').forEach(b => b.classList.remove('active'));
          const customBtn = paletteContainer.querySelector('.custom-color-btn');
          if (customBtn) customBtn.classList.add('active');
        }
        this.applyDesignAndMotion();
        this.saveSettings();
      });
    }

    // Segmented controls binding (Glass, Motion, Radius)
    const bindSegmentedControl = (containerId, attr, settingKey) => {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.addEventListener('click', (e) => {
        const btn = e.target.closest('.segmented-btn');
        if (!btn) return;
        const val = btn.getAttribute(attr);
        if (!val) return;

        el.querySelectorAll('.segmented-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        this.settings[settingKey] = val;
        this.applyDesignAndMotion();
        this.saveSettings();
      });
    };

    bindSegmentedControl('glass-opacity-selector', 'data-glass', 'glass');
    bindSegmentedControl('motion-style-selector', 'data-motion', 'motion');
    bindSegmentedControl('radius-style-selector', 'data-radius', 'radius');

    // Escape key closes open drawers & modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.drawer.open').forEach(d => d.classList.remove('open'));
        document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      }
    });

    // ── Performance & Battery Saving: Auto-Pause Video when Tab is Hidden ──
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.videoEl && !this.videoEl.paused) {
          this._wasAutoPaused = true;
          this.videoEl.pause();
        }
      } else {
        if (this._wasAutoPaused && this.videoEl && this.videoEl.style.display !== 'none') {
          this._wasAutoPaused = false;
          this.videoEl.play().catch(() => {});
        }
        this.updateClock();
      }
    });
  }
  // Widget toggle checkbox id -> settings.widgets anahtarı (tek kaynak)
  static WIDGET_TOGGLE_IDS = {
    'toggle-finance':       'finance',
    'toggle-weather':       'weather',
    'toggle-shortcuts':     'shortcuts',
    'toggle-quote':         'quote',
    'toggle-notes-btn':     'notes',
    'toggle-todo-btn':      'todo',
    'toggle-radar':         'radar',
    'toggle-analytics-btn': 'analytics'
  };
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.novaApp = new NovaApp();
});
