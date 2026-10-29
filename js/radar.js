/**
 * Nova Tab - Canlı Günün Radarı (Live Daily Radar)
 * 1. İnternetten anlık canlı veri çeker:
 *    - Hacker News (En Popüler Teknoloji Başlıkları + Otomatik Türkçe Çeviri)
 *    - Vikipedi Türkiye ("Tarihte Bugün" Canlı Kültür & Tarih Keşfi)
 *    - GitHub ("Günün Trend Açık Kaynak Repoları" & Araçları)
 *    - NASA APOD (Günün Astronomi & Bilim Keşfi)
 * 2. Akıllı Önbellek: İlk sekme açılışında 0ms gecikmeyle anında yüklenir, arka planda güncellenir.
 * 3. Çevrimdışı ve Hata Koruması: İnternet kesilse bile yerel zengin havuzla kesintisiz çalışır.
 */

const RADAR_FALLBACK_POOL = [
  {
    category: 'Teknoloji & AI',
    tag: 'tech',
    tagColor: 'blue',
    icon: '⚡',
    title: 'Cihaz İçi Yerel Yapay Zeka Devrimi (WebGPU & NPU)',
    desc: 'Tarayıcılarda doğrudan WebGPU ve yerel NPU kullanarak çalışan modeller, hiçbir sunucuya veri göndermeden %100 gizli ve anında çalışıyor.',
    metaText: '🔥 Öne Çıkan',
    metaType: 'fire',
    actionText: 'WebGPU AI İncele',
    url: 'https://huggingface.co/spaces'
  },
  {
    category: 'Günün Trend Aracı',
    tag: 'github',
    tagColor: 'purple',
    icon: '🛠️',
    title: 'Excalidraw & Mermaid JS ile Akıllı Şemalar',
    desc: 'Yalnızca birkaç satır metin veya serbest el çizimiyle saniyeler içinde profesyonel mimari diyagramlar ve akış şemaları üretin.',
    metaText: '⭐ 90k+ Yıldız',
    metaType: 'star',
    actionText: 'Excalidraw’ı Dene',
    url: 'https://excalidraw.com'
  },
  {
    category: 'Tarihte Bugün',
    tag: 'history',
    tagColor: 'orange',
    icon: '📜',
    title: 'Cumhuriyet ve Çağdaş Bilim Atılımları',
    desc: 'Tarihte bugün atılan adımlar; bağımsızlık, hür düşünce ve bilimin ışığında geleceğe bırakılan en değerli mirastır.',
    metaText: '📅 1923',
    metaType: 'date',
    actionText: 'Vikipedi’de Oku',
    url: 'https://tr.wikipedia.org'
  },
  {
    category: 'Kozmos & Bilim',
    tag: 'space',
    tagColor: 'emerald',
    icon: '🔬',
    title: 'James Webb: Evrenin İlk Işıkları ve Dev Galaksiler',
    desc: 'Büyük Patlama’dan sadece 300 milyon yıl sonrasına ait şaşırtıcı derecede parlak galaksiler keşfedilerek kozmoloji modelleri yeniden yazılıyor.',
    metaText: '🔭 NASA Keşfi',
    metaType: 'date',
    actionText: 'Webb Görselleri',
    url: 'https://webbtelescope.org'
  },
  {
    category: 'Günün Trend Aracı',
    tag: 'github',
    tagColor: 'purple',
    icon: '🛠️',
    title: 'Bruno & Hoppscotch: Hafif Açık Kaynak API İstemcileri',
    desc: 'Buluta bağımlı ağır araçlar yerine yerel git dosyalarıyla çalışan ve verinizi hiçbir yere göndermeyen minimalist API araçları.',
    metaText: '⭐ 30k+ Yıldız',
    metaType: 'star',
    actionText: 'GitHub’da İncele',
    url: 'https://usebruno.com'
  },
  {
    category: 'Teknoloji & Web',
    tag: 'tech',
    tagColor: 'blue',
    icon: '⚡',
    title: 'WebAssembly (Wasm) ile Doğal İşlemci Hızı',
    desc: 'C++, Rust ve Go kodları artık tarayıcıda doğrudan yerel işlemci hızında çalışıyor; Figma ve Photoshop gücünü buradan alıyor.',
    metaText: '🔥 Wasm Standardı',
    metaType: 'fire',
    actionText: 'Wasm Rehberi',
    url: 'https://webassembly.org'
  }
];

class RadarManager {
  constructor() {
    this.storageKey = 'nova_live_radar_cache_v3';
    this.widgetEl = document.getElementById('radar-widget');
    this.previewEl = document.getElementById('radar-pill-preview');
    this.modalEl = document.getElementById('radar-modal');
    this.cardsGridEl = document.getElementById('radar-modal-cards');
    this.refreshBtn = document.getElementById('radar-modal-refresh-btn');
    this.refreshIcon = document.getElementById('radar-refresh-icon');
    this.refreshLabel = document.getElementById('radar-refresh-label');
    this.closeBtn = document.getElementById('radar-modal-close-btn');
    this.doneBtn = document.getElementById('radar-modal-done-btn');
    this.tabsNav = document.getElementById('radar-tabs-nav');
    this.liveIndicator = document.getElementById('radar-live-indicator');
    this.statusDesc = document.getElementById('radar-status-desc');

    this.activeTab = 'all'; // all, tech, history, github, space
    this.isLoading = false;
    this.liveData = {
      tech: [],
      history: [],
      github: [],
      space: [],
      mixed: []
    };
    this.lastUpdated = null;

    this.init();
  }

  async init() {
    this.bindEvents();
    const hasCache = this.loadFromCache();

    if (hasCache) {
      this.render();
      // Önbellek 3 saatten eskiyse arka planda sessizce güncelle
      const ageHours = (Date.now() - (this.lastUpdated || 0)) / (1000 * 60 * 60);
      if (ageHours > 3) {
        this.fetchLiveAll(false);
      }
    } else {
      // Önbellek yoksa anında canlı çekmeye başla, fallback'i önce göster
      this.populateFallback();
      this.render();
      this.fetchLiveAll(true);
    }
  }

  // 1. Önbellek Yükleme
  loadFromCache() {
    try {
      const cached = localStorage.getItem(this.storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.liveData && parsed.liveData.mixed && parsed.liveData.mixed.length > 0) {
          this.liveData = parsed.liveData;
          this.lastUpdated = parsed.lastUpdated || Date.now();
          return true;
        }
      }
    } catch (e) {
      console.warn('Radar önbellek okuma hatası:', e);
    }
    return false;
  }

  // 2. Önbelleğe Kaydetme
  saveToCache() {
    try {
      this.lastUpdated = Date.now();
      localStorage.setItem(this.storageKey, JSON.stringify({
        lastUpdated: this.lastUpdated,
        liveData: this.liveData
      }));
    } catch (e) {
      console.warn('Radar önbelleğe kaydedilemedi:', e);
    }
  }

  // 3. Çevrimdışı / Hata Anı Fallback Verisi
  populateFallback() {
    this.liveData.mixed = [...RADAR_FALLBACK_POOL];
    this.liveData.tech = RADAR_FALLBACK_POOL.filter(i => i.tag === 'tech');
    this.liveData.github = RADAR_FALLBACK_POOL.filter(i => i.tag === 'github');
    this.liveData.history = RADAR_FALLBACK_POOL.filter(i => i.tag === 'history');
    this.liveData.space = RADAR_FALLBACK_POOL.filter(i => i.tag === 'space');
  }

  // 4. Tüm Canlı Verileri İnternetten Çekme
  async fetchLiveAll(showSpinner = true) {
    if (this.isLoading) return;
    this.isLoading = true;

    if (this.refreshIcon) this.refreshIcon.classList.add('rotating');
    if (this.refreshLabel) this.refreshLabel.textContent = 'Çekiliyor...';
    if (this.liveIndicator) this.liveIndicator.textContent = '⏳ Canlı Veri Çekiliyor...';

    if (showSpinner && (!this.liveData.mixed || this.liveData.mixed.length === 0)) {
      this.renderLoading();
    }

    try {
      // 4 Kaynağı paralel çek
      const [historyRes, techRes, githubRes, spaceRes] = await Promise.allSettled([
        this.fetchWikipediaHistory(),
        this.fetchHackerNews(),
        this.fetchGitHubTrending(),
        this.fetchNasaApod()
      ]);

      const historyItems = historyRes.status === 'fulfilled' && historyRes.value ? historyRes.value : [];
      const techItems = techRes.status === 'fulfilled' && techRes.value ? techRes.value : [];
      const githubItems = githubRes.status === 'fulfilled' && githubRes.value ? githubRes.value : [];
      const spaceItems = spaceRes.status === 'fulfilled' && spaceRes.value ? spaceRes.value : [];

      if (historyItems.length) this.liveData.history = historyItems;
      if (techItems.length) this.liveData.tech = techItems;
      if (githubItems.length) this.liveData.github = githubItems;
      if (spaceItems.length) this.liveData.space = spaceItems;

      // Akıllı Karma Liste Oluştur (1 Tech, 1 Tarih, 1 GitHub, 1 NASA / ekstra)
      const mixed = [];
      if (techItems[0]) mixed.push(techItems[0]);
      if (historyItems[0]) mixed.push(historyItems[0]);
      if (githubItems[0]) mixed.push(githubItems[0]);
      if (spaceItems[0]) mixed.push(spaceItems[0]);
      else if (techItems[1]) mixed.push(techItems[1]);

      if (mixed.length > 0) {
        this.liveData.mixed = mixed;
      } else if (!this.liveData.mixed || this.liveData.mixed.length === 0) {
        this.populateFallback();
      }

      this.saveToCache();
    } catch (err) {
      console.warn('Canlı radar çekim hatası:', err);
      if (!this.liveData.mixed || this.liveData.mixed.length === 0) {
        this.populateFallback();
      }
    } finally {
      this.isLoading = false;
      if (this.refreshIcon) this.refreshIcon.classList.remove('rotating');
      if (this.refreshLabel) this.refreshLabel.textContent = 'Yenile';
      if (this.liveIndicator) this.liveIndicator.textContent = '🟢 Canlı İnternet Akışı';
      this.updateStatusTime();
      this.render();
    }
  }

  // --- KAYNAK 1: Vikipedi Türkiye "Tarihte Bugün" (100% Doğal Türkçe) ---
  async fetchWikipediaHistory() {
    try {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const url = `https://tr.wikipedia.org/api/rest_v1/feed/onthisday/selected/${month}/${day}`;

      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) return [];

      const data = await res.json();
      if (!data.selected || !Array.isArray(data.selected)) return [];

      // En ilginç 4 olayı seç
      const items = data.selected.slice(0, 4).map(item => {
        const page = item.pages && item.pages[0];
        const pageTitle = page && page.titles && page.titles.normalized ? page.titles.normalized : '';
        const pageUrl = page && page.content_urls && page.content_urls.desktop ? page.content_urls.desktop.page : 'https://tr.wikipedia.org';
        const thumbnail = page && page.thumbnail ? page.thumbnail.source : null;

        return {
          category: 'Tarihte Bugün',
          tag: 'history',
          tagColor: 'orange',
          icon: '📜',
          title: `${item.year} • ${pageTitle || 'Tarihi Dönüm Noktası'}`,
          desc: item.text,
          metaText: `📅 ${item.year}`,
          metaType: 'date',
          actionText: 'Vikipedi’de Oku',
          url: pageUrl,
          thumbnail: thumbnail
        };
      });

      return items;
    } catch (e) {
      console.warn('Vikipedi Tarihte Bugün hatası:', e);
      return [];
    }
  }

  // --- KAYNAK 2: Hacker News En Popüler Trendler ---
  async fetchHackerNews() {
    try {
      const topUrl = 'https://hacker-news.firebaseio.com/v0/topstories.json';
      const res = await fetch(topUrl);
      if (!res.ok) return [];

      const ids = await res.json();
      if (!Array.isArray(ids) || ids.length === 0) return [];

      // İlk 4 hikayeyi detaylandır
      const selectedIds = ids.slice(0, 4);
      const storyPromises = selectedIds.map(async id => {
        try {
          const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          if (itemRes.ok) return await itemRes.json();
        } catch (e) {}
        return null;
      });

      const rawStories = (await Promise.all(storyPromises)).filter(s => s && s.title);

      // Başlıkları Türkçeye çevir
      const translatedItems = await Promise.all(rawStories.map(async story => {
        let titleTr = story.title;
        try {
          const tr = await this.translateToTurkish(story.title);
          if (tr) titleTr = tr;
        } catch (e) {}

        const points = story.score || 0;
        const comments = story.descendants || 0;
        const author = story.by || 'anonim';
        const targetUrl = story.url || `https://news.ycombinator.com/item?id=${story.id}`;

        return {
          category: 'Teknoloji & HN',
          tag: 'tech',
          tagColor: 'blue',
          icon: '⚡',
          title: titleTr,
          desc: `${points} puan • ${comments} yorum • Paylaşan: @${author}`,
          metaText: `🔥 ${points} Puan`,
          metaType: 'fire',
          actionText: 'Haber Kaynağı',
          url: targetUrl
        };
      }));

      return translatedItems;
    } catch (e) {
      console.warn('Hacker News çekim hatası:', e);
      return [];
    }
  }

  // --- KAYNAK 3: GitHub Trend Açık Kaynak Araçları ---
  async fetchGitHubTrending() {
    try {
      // Son 30 gün içinde popüler olan veya çok yıldız alan projeler
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const dateStr = d.toISOString().split('T')[0];
      const url = `https://api.github.com/search/repositories?q=stars:>100+pushed:>${dateStr}&sort=stars&order=desc&per_page=4`;

      const res = await fetch(url);
      if (!res.ok) return [];

      const data = await res.json();
      if (!data.items || !Array.isArray(data.items)) return [];

      const repos = await Promise.all(data.items.slice(0, 4).map(async repo => {
        let descTr = repo.description || 'Geliştiriciler için popüler açık kaynak projesi.';
        if (repo.description && repo.description.length < 180) {
          try {
            const tr = await this.translateToTurkish(repo.description);
            if (tr) descTr = tr;
          } catch (e) {}
        }

        const stars = repo.stargazers_count > 1000 
          ? `${(repo.stargazers_count / 1000).toFixed(1)}k` 
          : repo.stargazers_count;
        const lang = repo.language || 'Açık Kaynak';

        return {
          category: 'Trend Açık Kaynak',
          tag: 'github',
          tagColor: 'purple',
          icon: '🛠️',
          title: repo.full_name,
          desc: descTr,
          metaText: `⭐ ${stars} • ${lang}`,
          metaType: 'star',
          actionText: 'GitHub Reposu',
          url: repo.html_url
        };
      }));

      return repos;
    } catch (e) {
      console.warn('GitHub çekim hatası:', e);
      return [];
    }
  }

  // --- KAYNAK 4: NASA Günün Astronomi Keşfi (APOD) ---
  async fetchNasaApod() {
    try {
      const url = 'https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY';
      const res = await fetch(url);
      if (!res.ok) return [];

      const apod = await res.json();
      if (!apod || !apod.title) return [];

      let titleTr = apod.title;
      let descTr = apod.explanation ? apod.explanation.slice(0, 180) + '...' : 'NASA Günün Astronomi Fotoğrafı';

      try {
        const tTitle = await this.translateToTurkish(apod.title);
        if (tTitle) titleTr = tTitle;
        if (apod.explanation) {
          const tDesc = await this.translateToTurkish(apod.explanation.slice(0, 160));
          if (tDesc) descTr = tDesc + '...';
        }
      } catch (e) {}

      return [{
        category: 'NASA Günün Keşfi',
        tag: 'space',
        tagColor: 'emerald',
        icon: '🔭',
        title: titleTr,
        desc: descTr,
        metaText: '🔬 NASA APOD',
        metaType: 'date',
        actionText: 'Uzay Keşfini Gör',
        url: apod.hdurl || apod.url || 'https://apod.nasa.gov',
        thumbnail: apod.media_type === 'image' ? apod.url : null
      }];
    } catch (e) {
      console.warn('NASA APOD çekim hatası:', e);
      return [];
    }
  }

  // --- Hızlı Türkçe Çeviri Motoru (Ortak NovaUtils.translate sarmalayıcısı) ---
  async translateToTurkish(text) {
    return NovaUtils.translate(text, { sl: 'auto', timeout: 2500 });
  }

  // --- Kartları Ekrana Basma ---
  render() {
    let itemsToRender = [];

    if (this.activeTab === 'all') {
      itemsToRender = this.liveData.mixed && this.liveData.mixed.length ? this.liveData.mixed : RADAR_FALLBACK_POOL;
    } else if (this.activeTab === 'tech') {
      itemsToRender = this.liveData.tech && this.liveData.tech.length ? this.liveData.tech : RADAR_FALLBACK_POOL.filter(i => i.tag === 'tech');
    } else if (this.activeTab === 'history') {
      itemsToRender = this.liveData.history && this.liveData.history.length ? this.liveData.history : RADAR_FALLBACK_POOL.filter(i => i.tag === 'history');
    } else if (this.activeTab === 'github') {
      itemsToRender = this.liveData.github && this.liveData.github.length ? this.liveData.github : RADAR_FALLBACK_POOL.filter(i => i.tag === 'github');
    } else if (this.activeTab === 'space') {
      itemsToRender = this.liveData.space && this.liveData.space.length ? this.liveData.space : RADAR_FALLBACK_POOL.filter(i => i.tag === 'space');
    }

    // Alt bardaki Hap Önizlemesini Güncelle
    if (this.previewEl && itemsToRender[0]) {
      const first = itemsToRender[0];
      const icon = first.icon || '⚡';
      const shortTitle = first.title.length > 32 ? first.title.slice(0, 32) + '...' : first.title;
      this.previewEl.textContent = `${icon} ${shortTitle} ↗`;
    }

    if (!this.cardsGridEl) return;
    this.cardsGridEl.innerHTML = '';

    itemsToRender.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = `radar-card-item tag-${item.tagColor || 'blue'}`;

      let thumbHtml = '';
      if (item.thumbnail) {
        const safeThumb = NovaUtils.safeUrl(item.thumbnail);
        if (safeThumb) {
          thumbHtml = `
            <div class="radar-card-thumb-wrap">
              <img src="${safeThumb}" alt="${NovaUtils.escapeHtml(item.title || '')}" class="radar-card-thumb" loading="lazy">
            </div>
          `;
        }
      }

      let metaHtml = '';
      if (item.metaText) {
        let metaClass = 'meta-default';
        if (item.metaType === 'star') metaClass = 'meta-star';
        else if (item.metaType === 'fire') metaClass = 'meta-fire';
        else if (item.metaType === 'date') metaClass = 'meta-date';
        metaHtml = `<span class="radar-meta-badge ${metaClass}">${NovaUtils.escapeHtml(item.metaText)}</span>`;
      }

      const safeLink = NovaUtils.safeUrl(item.url) || '#';

      card.innerHTML = `
        <div class="radar-card-top">
          <span class="radar-category-badge">
            <span class="category-icon">${NovaUtils.escapeHtml(item.icon || '⚡')}</span>
            <span>${NovaUtils.escapeHtml(item.category || 'Keşif')}</span>
          </span>
          ${metaHtml}
        </div>
        ${thumbHtml}
        <h4 class="radar-card-title">${NovaUtils.escapeHtml(item.title)}</h4>
        <p class="radar-card-desc">${NovaUtils.escapeHtml(item.desc)}</p>
        <div class="radar-card-footer">
          <a href="${safeLink}" target="_blank" rel="noopener noreferrer" class="radar-card-action">
            <span>${NovaUtils.escapeHtml(item.actionText || 'İncele')}</span>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2-9.2M17 17V8H8"/></svg>
          </a>
        </div>
      `;

      // Thumbnail yüklenemezse görsel kutusunu gizle (CSP uyumlu, inline handler'sız)
      const thumbImg = card.querySelector('.radar-card-thumb');
      if (thumbImg) {
        thumbImg.addEventListener('error', () => {
          const wrap = thumbImg.parentElement;
          if (wrap) wrap.style.display = 'none';
        });
      }

      this.cardsGridEl.appendChild(card);
    });
  }

  renderLoading() {
    if (!this.cardsGridEl) return;
    this.cardsGridEl.innerHTML = `
      <div class="radar-loading-container">
        <div class="radar-spinner"></div>
        <span>Canlı kaynaklardan (Hacker News, Vikipedi, GitHub, NASA) güncel veri alınıyor...</span>
      </div>
    `;
  }

  updateStatusTime() {
    if (!this.statusDesc) return;
    if (this.lastUpdated) {
      const d = new Date(this.lastUpdated);
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      this.statusDesc.textContent = `Hacker News, Vikipedi, GitHub ve NASA'dan anlık güncellendi • Son güncelleme: ${timeStr}`;
    }
  }

  openModal() {
    if (!this.modalEl) return;
    this.render();
    this.modalEl.classList.add('open');
  }

  closeModal() {
    if (!this.modalEl) return;
    this.modalEl.classList.remove('open');
  }

  bindEvents() {
    // Tıklayınca Modalı Aç
    if (this.widgetEl) {
      this.widgetEl.addEventListener('click', () => this.openModal());
      this.widgetEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.openModal();
        }
      });
    }

    // Modal Kapatma
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.closeModal());
    if (this.doneBtn) this.doneBtn.addEventListener('click', () => this.closeModal());

    // Yenile Butonu (Zorla canlı çek)
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener('click', () => {
        this.fetchLiveAll(true);
      });
    }

    // Kategori Sekmeleri (Tabs)
    if (this.tabsNav) {
      this.tabsNav.addEventListener('click', (e) => {
        const btn = e.target.closest('.radar-tab-btn');
        if (!btn) return;
        const targetTab = btn.getAttribute('data-tab');
        if (!targetTab) return;

        this.tabsNav.querySelectorAll('.radar-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        this.activeTab = targetTab;
        this.render();
      });
    }

    // Modal Dışına Tıklama
    if (this.modalEl) {
      this.modalEl.addEventListener('click', (e) => {
        if (e.target === this.modalEl) this.closeModal();
      });
    }

    // Escape ile kapatma global olarak app.js tarafından yönetilir (.modal-overlay.open)
  }
}

// Global Örnek
window.radarManager = new RadarManager();
