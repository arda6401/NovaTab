/**
 * Nova Tab - Shared Utility Helpers
 * Tüm manager modüllerinin ortak kullandığı yardımcılar:
 * - NovaUtils.escapeHtml()  : HTML entity escaping (XSS koruması)
 * - NovaUtils.safeUrl()     : Yalnızca http/https şemasına izin veren URL doğrulama
 * - NovaUtils.faviconUrl()  : Ortak favicon üretimi (Google s2 servisi)
 * - NovaUtils.translate()   : Ortak Türkçe çeviri (Google Translate ücretsiz ucu)
 */

const NovaUtils = {
  escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /**
   * Link/attribute olarak güvenle kullanılabilecek bir URL döndürür.
   * javascript:, data:, vbscript: gibi tehlikeli şemaları boş string ile reddeder.
   */
  safeUrl(raw) {
    if (!raw || typeof raw !== 'string') return '';
    try {
      const url = new URL(raw.trim());
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
    } catch (e) {}
    return '';
  },

  /** Geçerli bir adresse dayalı favicon URL'i üretir; hatalıysa boş döner. */
  faviconUrl(url, size = 32) {
    let domain = '';
    try {
      domain = new URL(String(url).trim()).hostname;
    } catch (e) {
      return '';
    }
    return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}` : '';
  },

  /**
   * Google Translate ücretsiz ucu (client=gtx) ile çeviri.
   * Kısa timeout'lu AbortController kullanır; hata/timeout durumunda null döner.
   */
  async translate(text, { sl = 'auto', tl = 'tr', timeout = 2500 } = {}) {
    if (!text || typeof text !== 'string') return null;
    const cleanText = text.trim();
    if (!cleanText) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(cleanText)}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        if (data && data[0]) {
          const translated = data[0].map(item => (item && item[0]) ? item[0] : '').join('').trim();
          return translated || null;
        }
      }
    } catch (e) {
      clearTimeout(timer);
    }
    return null;
  }
};

window.NovaUtils = NovaUtils;
