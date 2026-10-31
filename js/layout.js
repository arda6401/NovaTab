/**
 * Nova Tab — Layout Manager (v5.6)
 * Serbest konumlandırma:
 *  - Her widget yüzde bazlı {x, y} merkezi koordinatıyla ekranda hareket eder
 *  - Eski 9-bölge kayıtları otomatik olarak % koordinata çevrilir (migrasyon)
 *  - Edit modunda widget'lar serbestçe sürüklenir; çakışan bırakma geri alınır ve uyarı gösterilir
 *  - "Kaydet" kalıcı, "Vazgeç"/Escape geri alır
 */

class LayoutManager {
  constructor(app) {
    this.app = app;
    this.zonesEl = document.getElementById('layout-zones');
    this.toggleBtn = document.getElementById('layout-toggle-btn');
    this.openFromSettingsBtn = document.getElementById('open-layout-editor-btn');
    this.toolbarEl = document.getElementById('layout-edit-toolbar');
    this.saveBtn = document.getElementById('layout-edit-save-btn');
    this.cancelBtn = document.getElementById('layout-edit-cancel-btn');
    this.resetBtn = document.getElementById('layout-edit-reset-btn');
    this.hintEl = this.toolbarEl ? this.toolbarEl.querySelector('.layout-edit-hint > span') : null;

    this.isEditing = false;
    this.activeDrag = null;
    this.preEditPositions = null;
    this.hintResetTimer = null;

    // İçerikle büyüyen widget: sol üst köşe sabit, büyüme sağa/aşağı (quote-widget)
    this.EDGE_LOCK_WIDGET_ID = 'quote-widget';
    this.edgeLock = null;
    this.edgeRO = null;

    // Güvenlik ağı: storage yüksek gecikmeli/askıda kalırsa widget'lar yine görünür olsun
    setTimeout(() => this.reveal(), 400);

    // Kullanıcının onayladığı varsayılan düzen (birebir {x,y})
    this.DEFAULT_POSITIONS = {
      'weather-widget':    { x: 8,    y: 8 },
      'quote-widget':      { x: 13.7, y: 15.9 },
      'finance-widget':    { x: 47.4, y: 8 },
      'clock-block':       { x: 49.2, y: 32.8 },
      'search-section':    { x: 50,   y: 49 },
      'shortcuts-section': { x: 50,   y: 65 },
      'radar-widget':      { x: 11.5, y: 92 },
      'bottom-actions':    { x: 83.6, y: 92 }
    };

    // Eski 9-bölge haritası: geçmiş kayıtların migrasyonu için korunur
    this.DEFAULT_ZONE_LAYOUT = {
      'weather-widget':    'top-left',
      'quote-widget':      'top-left',
      'finance-widget':    'top-right',
      'clock-block':       'mid-center',
      'search-section':    'mid-center',
      'shortcuts-section': 'mid-center',
      'radar-widget':      'bot-left',
      'bottom-actions':    'bot-right',
    };

    // Eski bölge merkezleri (% koordinat: widget MERKEZİ)
    // Widget'ların tipik genişliği hesaba katıldı; 1000-1920px genişlikte kenar
    // taşması olmayacak şekilde ayarlandı (çok sol/sağ çapalı sarkma düzeltildi)
    this.ZONE_ANCHORS = {
      'top-left':   { x: 20, y: 10 },
      'top-center': { x: 50, y: 13 },
      'top-right':  { x: 84, y: 9 },
      'mid-left':   { x: 12, y: 50 },
      'mid-center': { x: 50, y: 33 },
      'mid-right':  { x: 88, y: 50 },
      'bot-left':   { x: 14, y: 86 },
      'bot-center': { x: 50, y: 85 },
      'bot-right':  { x: 79, y: 87 }
    };
    this.STACK_STEP = 16;   // Aynı eski bölgedeki ikinci widget için dikey kayma
    this.CLAMP = { xMin: 6, xMax: 94, yMin: 8, yMax: 92 };
    this.OVERLAP_TOLERANCE = 8; // px — bu kadarlıktan az örtüşme "değiniyor" sayılır

    this.HINT_DEFAULT = this.hintEl ? this.hintEl.textContent : '';

    this.bindEvents();
  }

  /* ── Migrasyon: eski harita / serbest karışık → tamamen {x,y} haritası ── */
  migrateLayout(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    const zoneCounts = {};

    for (const [widgetId, value] of Object.entries(raw)) {
      if (value && typeof value === 'object' && Number.isFinite(value.x) && Number.isFinite(value.y)) {
        out[widgetId] = this.clampPos(value.x, value.y);
      } else if (value && this.ZONE_ANCHORS[value]) {
        // Eski bölge formatı: bölge merkezine hizala, üst üste binenler dikey istiflenir
        const anchor = this.ZONE_ANCHORS[value];
        const index = zoneCounts[value] || 0;
        zoneCounts[value] = index + 1;
        out[widgetId] = this.clampPos(anchor.x, anchor.y + index * this.STACK_STEP);
      }
      // Bilinmeyen değerler atlanır; widget varsayılan konumunu alır
    }
    return out;
  }

  clampPos(x, y) {
    return {
      x: Math.min(this.CLAMP.xMax, Math.max(this.CLAMP.xMin, Math.round(x * 10) / 10)),
      y: Math.min(this.CLAMP.yMax, Math.max(this.CLAMP.yMin, Math.round(y * 10) / 10))
    };
  }

  /* ── Kayıtlı konumları DOM'a uygula ── */
  applyLayout(raw) {
    if (!this.zonesEl) return;

    let layout = (raw && Object.keys(raw).length) ? raw : this.app.settings.layout;
    if (layout && Object.values(layout).some(v => typeof v === 'string')) {
      layout = this.migrateLayout(layout);
    }

    // Eksik widget'lar varsayılan konumlara tamamlanır
    const finalMap = { ...this.DEFAULT_POSITIONS, ...layout };

    this.zonesEl.querySelectorAll('[data-widget]').forEach(widget => {
      const pos = finalMap[widget.id];
      if (!pos) return;
      widget.style.left = `${pos.x}%`;
      widget.style.top = `${pos.y}%`;
    });

    this.setupEdgeLock();
  }

  /* ── Düzen uygulandı: widget'ları doğru konumlarında açığa çıkar ── */
  reveal() {
    if (this.zonesEl) this.zonesEl.classList.add('layout-ready');
  }

  /* ── İçerikle Büyüyen Widget: Sabit Başlangıç Kenarı ──
     Widget'lar merkez noktasından konumlanır; kutu büyüdüğünde iki yöne
     açılır. quote-widget için başlangıç sol üst köşesi kilitlenir:
     metin uzarsa kutu yalnızca sağa (ve alt satıra) doğru büyür,
     kısalırsa dengeli biçimde çöker. */
  setupEdgeLock() {
    const widget = document.getElementById(this.EDGE_LOCK_WIDGET_ID);
    if (!widget) return;

    if (this.edgeRO) this.edgeRO.disconnect();
    this.edgeLock = { w: widget.offsetWidth, h: widget.offsetHeight };

    if (!this.edgeRO) {
      this.edgeRO = new ResizeObserver(() => this.applyEdgeLock());
    }
    this.edgeRO.observe(widget);
    this.applyEdgeLock();
  }

  applyEdgeLock() {
    const widget = document.getElementById(this.EDGE_LOCK_WIDGET_ID);
    if (!widget || !this.edgeLock) return;
    // Küçük ekranlarda widget'lar akışta (flex) dizilir; merkez çapası yoktur
    if (!window.matchMedia('(min-width: 721px)').matches) {
      widget.style.transform = '';
      return;
    }
    // left/top % + translate(-50%,-50%) çapasını koru; sadece boyut farkının
    // yarısını piksel ofsetiyle telafi et → sol üst köşe sabit kalır
    const dx = (widget.offsetWidth - this.edgeLock.w) / 2;
    const dy = (widget.offsetHeight - this.edgeLock.h) / 2;
    widget.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  /* ── Düzenleme Modu Giriş / Çıkış ── */

  enterEditMode() {
    if (this.isEditing || !this.zonesEl) return;

    // Küçük ekranlarda widget'lar CSS ile dikey istiflenir; serbest konum anlamsızlaşır
    if (window.innerWidth <= 720) {
      alert('Serbest düzen büyük ekranlarda düzenlenebilir. Küçük ekranlarda widget\'lar otomatik dikey dizilir.');
      return;
    }

    this.isEditing = true;
    this.activeDrag = null;

    // Geri alma için inline % konumlarının anlık görüntüsü
    this.preEditPositions = {};
    this.zonesEl.querySelectorAll('[data-widget]').forEach(widget => {
      this.preEditPositions[widget.id] = {
        x: parseFloat(widget.style.left) || 50,
        y: parseFloat(widget.style.top) || 50
      };
      if (widget.style.display === 'none') {
        widget.style.display = '';
        widget.classList.add('widget-hidden-hint');
      }
    });

    this.zonesEl.classList.add('edit-mode');
    document.body.classList.add('layout-edit-active');

    // Edit modda widget tıklamalarını (radar modalı vb.) blokla
    this._onEditClick = (e) => e.stopImmediatePropagation();
    this.zonesEl.addEventListener('click', this._onEditClick, true);

    // Escape = kaydetmeden çıkış
    this._onKeydown = (e) => {
      if (e.key === 'Escape' && this.isEditing) {
        e.stopImmediatePropagation();
        this.exitEditMode(false);
      }
    };
    document.addEventListener('keydown', this._onKeydown, true);
  }

  exitEditMode(save) {
    if (!this.isEditing) return;
    this.isEditing = false;

    this.zonesEl.classList.remove('edit-mode');
    document.body.classList.remove('layout-edit-active');
    document.removeEventListener('keydown', this._onKeydown);
    if (this._onEditClick) {
      this.zonesEl.removeEventListener('click', this._onEditClick, true);
      this._onEditClick = null;
    }

    this.zonesEl.querySelectorAll('[data-widget]').forEach(widget => {
      widget.classList.remove('widget-dragging', 'widget-hidden-hint', 'widget-colliding');
    });

    if (this.activeDrag) this.endDrag(false);

    if (save) {
      this.saveLiveLayout();
      this.resetHint();
    } else {
      this.restorePreEditPositions();
    }

    // Widget görünürlüklerini (gizli olanlar dahil) ayarlardan geri yükle
    this.app.applySettings();
  }

  /* ── DOM'daki güncel inline konumlardan harita çıkar ve kaydet ── */
  saveLiveLayout() {
    const layout = {};
    this.zonesEl.querySelectorAll('[data-widget]').forEach(widget => {
      const x = parseFloat(widget.style.left);
      const y = parseFloat(widget.style.top);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        layout[widget.id] = this.clampPos(x, y);
      }
    });

    this.app.settings.layout = layout;
    this.app.saveSettings();
  }

  resetLiveLayout() {
    this.applyLayout(this.DEFAULT_POSITIONS);
  }

  /* ── Vazgeç: kaydedilmiş konumlara birebir dön ── */
  restorePreEditPositions() {
    if (!this.preEditPositions) return;
    this.zonesEl.querySelectorAll('[data-widget]').forEach(widget => {
      const pos = this.preEditPositions[widget.id];
      if (pos) {
        widget.style.left = `${pos.x}%`;
        widget.style.top = `${pos.y}%`;
      }
    });
    this.preEditPositions = null;
  }

  /* ── Serbest Sürükleme (Pointer Events, fare + dokunmatik) ── */

  beginDrag(e) {
    const widget = e.target.closest ? e.target.closest('[data-widget]') : null;
    if (!widget || widget.style.display === 'none') return;

    const contRect = this.zonesEl.getBoundingClientRect();
    const widgetRect = widget.getBoundingClientRect();
    const centerY = (widgetRect.top + widgetRect.height / 2 - contRect.top) / contRect.height * 100;
    const centerX = (widgetRect.left + widgetRect.width / 2 - contRect.left) / contRect.width * 100;

    // Pointer ile widget merkezi arasındaki grab farkını koru (doğal taşıma hissi)
    const offX = ((e.clientX - contRect.left) / contRect.width * 100) - centerX;
    const offY = ((e.clientY - contRect.top) / contRect.height * 100) - centerY;

    this.activeDrag = {
      widget,
      pointerId: e.pointerId,
      offX,
      offY,
      startPos: { x: centerX, y: centerY }
    };

    try { widget.setPointerCapture(e.pointerId); } catch (err) {}
    widget.classList.add('widget-dragging');
    this.resetHint();
  }

  onDragMove(e) {
    if (!this.activeDrag || e.pointerId !== this.activeDrag.pointerId) return;
    const contRect = this.zonesEl.getBoundingClientRect();
    const { widget } = this.activeDrag;

    const x = ((e.clientX - contRect.left) / contRect.width * 100) - this.activeDrag.offX;
    const y = ((e.clientY - contRect.top) / contRect.height * 100) - this.activeDrag.offY;
    const clamped = this.clampPos(x, y);

    widget.style.left = `${clamped.x}%`;
    widget.style.top = `${clamped.y}%`;
    e.preventDefault();
  }

  endDrag(shouldPlace = true) {
    const drag = this.activeDrag;
    if (!drag) return;
    this.activeDrag = null;

    try { drag.widget.releasePointerCapture(drag.pointerId); } catch (err) {}
    drag.widget.classList.remove('widget-dragging');

    if (!shouldPlace) return;

    // Bırakma noktasında çakışma kontrolü
    if (this.findCollision(drag.widget)) {
      const revert = this.clampPos(drag.startPos.x, drag.startPos.y);
      drag.widget.style.left = `${revert.x}%`;
      drag.widget.style.top = `${revert.y}%`;
      this.flashCollision(drag.widget);
      this.warnHint();
    }
  }

  /* Widget'ın bulunduğu düzlemde başka bir widget'la çakışıyor mu? */
  findCollision(widget) {
    const contRect = this.zonesEl.getBoundingClientRect();
    const x = parseFloat(widget.style.left) || 50;
    const y = parseFloat(widget.style.top) || 50;

    const cx = contRect.left + (x / 100) * contRect.width;
    const cy = contRect.top + (y / 100) * contRect.height;
    const halfW = widget.offsetWidth / 2;
    const halfH = widget.offsetHeight / 2;
    const tol = this.OVERLAP_TOLERANCE;

    for (const other of this.zonesEl.querySelectorAll('[data-widget]')) {
      if (other === widget || other.style.display === 'none') continue;
      const r = other.getBoundingClientRect();
      if (cx - halfW < r.right - tol && cx + halfW > r.left + tol &&
          cy - halfH < r.bottom - tol && cy + halfH > r.top + tol) {
        return other;
      }
    }
    return null;
  }

  flashCollision(widget) {
    widget.classList.add('widget-colliding');
    setTimeout(() => widget.classList.remove('widget-colliding'), 600);
  }

  warnHint() {
    if (!this.hintEl) return;
    if (this.hintResetTimer) clearTimeout(this.hintResetTimer);
    this.hintEl.textContent = '⚠️ Widget üst üste binemez — başka yere bırak';
    this.hintResetTimer = setTimeout(() => this.resetHint(), 2400);
  }

  resetHint() {
    if (!this.hintEl) return;
    if (this.hintResetTimer) {
      clearTimeout(this.hintResetTimer);
      this.hintResetTimer = null;
    }
    this.hintEl.textContent = this.HINT_DEFAULT;
  }

  /* ── Olay Bağlama ── */
  bindEvents() {
    // Chrome kontrollerindeki düzen butonu; edit moddaysa kaydedip çıkar
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => {
        if (this.isEditing) this.exitEditMode(true);
        else this.enterEditMode();
      });
    }

    // Ayarlar modalından giriş
    if (this.openFromSettingsBtn) {
      this.openFromSettingsBtn.addEventListener('click', () => {
        this.app.closeSettingsModal();
        this.enterEditMode();
      });
    }

    // Yüzen toolbar butonları
    if (this.saveBtn) this.saveBtn.addEventListener('click', () => this.exitEditMode(true));
    if (this.cancelBtn) this.cancelBtn.addEventListener('click', () => this.exitEditMode(false));
    if (this.resetBtn) this.resetBtn.addEventListener('click', () => this.resetLiveLayout());

    // Pointer tabanlı serbest sürükleme (zone delegation)
    if (this.zonesEl) {
      this.zonesEl.addEventListener('pointerdown', (e) => {
        if (this.isEditing) this.beginDrag(e);
      });
      this.zonesEl.addEventListener('pointermove', (e) => this.onDragMove(e));
      this.zonesEl.addEventListener('pointerup', (e) => {
        if (this.activeDrag && e.pointerId === this.activeDrag.pointerId) this.endDrag(true);
      });
      this.zonesEl.addEventListener('pointercancel', (e) => {
        if (this.activeDrag && e.pointerId === this.activeDrag.pointerId) this.endDrag(false);
      });
    }
  }
}

window.LayoutManager = LayoutManager;
