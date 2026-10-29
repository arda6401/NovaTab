/**
 * Nova Tab — Tutorial Manager (v5.7)
 * İlk çalıştırmada spotlight'lı adım adım tanıtım turu:
 *  - Gerçek UI öğelerini spot ile vurgular (box-shadow maske tekniği)
 *  - Gizli widget'ları otomatik atlar
 *  - Atlanabilir; Ayarlar > 🎓 Tutorial ile tekrar başlatılabilir
 *  - Tamamlama bayrağı sürüklü saklanır (nova_tutorial_done)
 *  - Klavye: Enter/→ ileri, ← geri, Esc atla
 */

class TutorialManager {
  constructor() {
    this.key = 'nova_tutorial_done';
    this.version = 1;

    this.overlayEl = document.getElementById('tutorial-overlay');
    this.spotlightEl = document.getElementById('tutorial-spotlight');
    this.cardEl = document.getElementById('tutorial-card');
    this.titleEl = document.getElementById('tutorial-title');
    this.descEl = document.getElementById('tutorial-desc');
    this.progressEl = document.getElementById('tutorial-progress');
    this.prevBtn = document.getElementById('tutorial-prev-btn');
    this.nextBtn = document.getElementById('tutorial-next-btn');
    this.skipBtn = document.getElementById('tutorial-skip-btn');
    this.replayBtn = document.getElementById('tutorial-replay-btn');

    this.isRunning = false;
    this.activeSteps = [];
    this.index = 0;

    this.STEPS = [
      {
        target: null,
        title: 'Nova Tab\'a Hoş Geldin! 👋',
        desc: 'Yeni sekmen artık kişisel bir çalışma alanı. 30 saniyelik kısa bir tur ile hemen tanışalım — bu turu istediğin zaman Ayarlar\'dan tekrar başlatabilirsin.',
        nextLabel: 'Tur\'a Başla'
      },
      {
        target: '#clock-block',
        title: 'Saat & Kişisel Selamlama ⏰',
        desc: 'Saat, tarih ve ismine göre karşılama burada. Ayarlar > Kullanıcı Adı\'ndan ismini değiştirebilirsin.'
      },
      {
        target: '#search-section',
        title: 'Akıllı Arama 🔍',
        desc: 'Google, ChatGPT, Perplexity, YouTube, GitHub ve DuckDuckGo. Motor değiştirmek için yukarıdaki pillere tıkla ya da klavyeden "/" tuşuna bas. Link yazarsan doğrudan açar.'
      },
      {
        target: '#shortcuts-section',
        title: 'Hızlı Bağlantılar ⚡',
        desc: '"+ Ekle" kutusuyla sitelerini buraya koy. Sürükleyip bırakarak sırasını değiştirebilirsin — sıralama tüm cihazlarında senkron kalır.'
      },
      {
        target: '#layout-toggle-btn',
        title: 'Serbest Düzen ✋',
        desc: 'Bu butonla widget\'ları ekranın herhangi bir yerine sürükle-bırak yerleştirebilirsin. Konumlar yüzde olarak kaydedilir ve üst üste bineme engellenir.'
      },
      {
        target: '#radar-widget',
        title: 'Günün Radarı 🎯',
        desc: 'Hacker News, Vikipedi, GitHub ve NASA\'dan günlük canlı özet. Tıkla, kartlara dal — algoritma tuzağı yok.'
      },
      {
        target: '#tabs-toggle-btn',
        title: 'Sekme Yöneticisi 🗂️',
        desc: 'Açık tüm sekmelerini gör, arama yap ve tek tıkla geçiş yap. "Park Et" ile hepsini kaydedip hafızayı boşalt.'
      },
      {
        target: '#workspaces-toggle-btn',
        title: 'Çalışma Alanları 📁',
        desc: 'Sekme gruplarını proje bazlı kaydet; zaman ya da projeye göre tümünü tek tıkla geri aç.'
      },
      {
        target: '#settings-btn',
        title: 'Ayarlar ⚙️',
        desc: 'Tema, işletim sistemi (video/Unsplash/Yerel Dosya) arka planlar; şehir ayarı; widget görünürlüğü ve bulut senkronizasyonu hepsi burada.'
      },
      {
        target: null,
        title: 'Hazırsın! 🎉',
        desc: 'Kurulum tamam. Widget\'ları Ayarlar > Widget Görünürlüğü\'nden aç/kapat, düzenini 📐 butonundan serbestçe yeniden şekillendir. İyi kullanımlar!',
        nextLabel: 'Bitti 🎉'
      }
    ];

    this.bindEvents();
    this.init();
  }

  /* ── İlk çalıştırma kontrolü ── */
  async init() {
    let done = null;
    if (window.syncStorage) {
      done = await window.syncStorage.get(this.key, null);
    } else {
      try {
        const raw = localStorage.getItem(this.key);
        done = raw ? JSON.parse(raw) : null;
      } catch (e) {}
    }

    // Gelecekte yeni özellikler için version artırılabilir
    if (done && done.v >= this.version) return;

    // Widget/yerleşim render edilsin diye ufak gecikme
    setTimeout(() => {
      if (!this.isRunning) this.start();
    }, 900);
  }

  markDone() {
    const data = { v: this.version, at: Date.now() };
    if (window.syncStorage) window.syncStorage.set(this.key, data);
    try { localStorage.setItem(this.key, JSON.stringify(data)); } catch (e) {}
  }

  /* ── Tur akışı ── */

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Ayarlar modalı açıksa kapat
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) settingsModal.classList.remove('open');
    document.querySelectorAll('.drawer.open').forEach(d => d.classList.remove('open'));

    // Gizli / eksik hedefleri filtrele
    this.activeSteps = this.STEPS.filter(step => !step.target || this.getVisibleTarget(step));

    this.index = 0;
    this.overlayEl.classList.add('open');
    document.body.classList.add('tutorial-active');

    document.addEventListener('keydown', this._onKeydown = (e) => this.handleKey(e), true);
    window.addEventListener('resize', this._onResize = () => this.render());

    this.render();
  }

  close() {
    if (!this.isRunning) return;
    this.isRunning = false;

    this.overlayEl.classList.remove('open');
    document.body.classList.remove('tutorial-active');
    document.removeEventListener('keydown', this._onKeydown, true);
    window.removeEventListener('resize', this._onResize);
  }

  finish() {
    this.markDone();
    this.close();
  }

  next() {
    if (this.index >= this.activeSteps.length - 1) {
      this.finish();
      return;
    }
    this.index++;
    this.render();
  }

  prev() {
    if (this.index <= 0) return;
    this.index--;
    this.render();
  }

  skip() {
    this.finish();
  }

  handleKey(e) {
    if (!this.isRunning) return;
    if (e.key === 'Enter' || e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.prev();
    } else if (e.key === 'Escape') {
      e.stopImmediatePropagation();
      this.skip();
    }
  }

  /* ── Adım render ── */

  getVisibleTarget(step) {
    const el = document.querySelector(step.target);
    if (!el) return null;
    if (el.style.display === 'none' || el.offsetParent === null) return null;
    return el;
  }

  render() {
    if (!this.isRunning) return;
    const step = this.activeSteps[this.index];
    if (!step) { this.close(); return; }

    const isFirst = this.index === 0;
    const isLast = this.index === this.activeSteps.length - 1;

    // Progress dots
    if (this.progressEl) {
      this.progressEl.innerHTML = this.activeSteps.map((s, i) =>
        `<span class="tutorial-dot ${i === this.index ? 'active' : ''}"></span>`
      ).join('');
    }

    this.titleEl.textContent = step.title;
    this.descEl.textContent = step.desc;
    this.nextBtn.textContent = step.nextLabel || (isLast ? 'Bitti 🎉' : 'Devam →');
    this.prevBtn.disabled = isFirst;

    // Hedef vurgula ya da merkez kart
    const targetEl = step.target ? this.getVisibleTarget(step) : null;
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      this.showSpotlight(rect);
      this.placeCard(rect);
    } else {
      this.spotlightEl.style.display = 'none';
      this.placeCard(null);
    }
  }

  showSpotlight(rect) {
    const pad = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.max(8, rect.left - pad);
    const top = Math.max(8, rect.top - pad);
    const width = Math.min(vw - left - 8, rect.width + pad * 2);
    const height = Math.min(vh - top - 8, rect.height + pad * 2);

    this.spotlightEl.style.display = 'block';
    this.spotlightEl.style.left = `${left}px`;
    this.spotlightEl.style.top = `${top}px`;
    this.spotlightEl.style.width = `${width}px`;
    this.spotlightEl.style.height = `${height}px`;
  }

  placeCard(rect) {
    if (!this.cardEl) return;
    const margin = 16;
    const gap = 18;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cw = this.cardEl.offsetWidth;
    const ch = this.cardEl.offsetHeight;

    let left, top;

    if (!rect) {
      // Merrezi kart (hoş geldin / bitiş)
      left = (vw - cw) / 2;
      top = (vh - ch) / 2;
    } else {
      // Tercih: hedefin altına, yoksa üstüne, yoksa yana
      if (rect.bottom + ch + gap < vh - margin) {
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - cw / 2;
      } else if (rect.top - ch - gap > margin) {
        top = rect.top - ch - gap;
        left = rect.left + rect.width / 2 - cw / 2;
      } else {
        left = rect.right + gap;
        if (left + cw > vw - margin) left = rect.left - cw - gap;
        top = rect.top + rect.height / 2 - ch / 2;
      }
      // Kenarlara sığdır
      left = Math.min(vw - cw - margin, Math.max(margin, left));
      top = Math.min(vh - ch - margin, Math.max(margin, top));
    }

    this.cardEl.style.left = `${left}px`;
    this.cardEl.style.top = `${top}px`;
  }

  /* ── Olaylar ── */
  bindEvents() {
    if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.next());
    if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.prev());
    if (this.skipBtn) this.skipBtn.addEventListener('click', () => this.skip());

    // Ayarlar > 🎓 Tutorial (tekrar izle)
    if (this.replayBtn) {
      this.replayBtn.addEventListener('click', () => {
        this.markDone(); // tekrar izlese bile bayrak güncel kalsın
        this.start();
      });
    }
  }
}

window.tutorialManager = new TutorialManager();
