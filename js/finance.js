/**
 * Finance / Currency & Crypto Tracker Module
 * Free open API endpoints with instant caching (USD, EUR, BTC, ETH)
 */

class FinanceManager {
  constructor() {
    this.cacheKey = 'nova_finance_cache';
    this.widgetEl = document.getElementById('finance-widget');
    this.containerEl = document.getElementById('finance-ticker');
    this.rates = {
      usdTry: null,
      eurTry: null,
      btcUsd: null
    };

    this.init();
  }

  init() {
    this.loadCache();
    this.fetchData();
    // Refresh every 15 minutes
    setInterval(() => this.fetchData(), 15 * 60 * 1000);
  }

  loadCache() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (cached) {
        this.rates = { ...this.rates, ...JSON.parse(cached) };
        this.render();
      }
    } catch (e) {}
  }

  async fetchData() {
    try {
      // 1. Fetch Fiat Currency (USD, EUR -> TRY)
      const resCurrency = await fetch('https://open.er-api.com/v6/latest/USD');
      if (resCurrency.ok) {
        const data = await resCurrency.json();
        if (data && data.rates && data.rates.TRY) {
          const usdTry = data.rates.TRY;
          const eurRate = data.rates.EUR;
          const eurTry = eurRate ? (usdTry / eurRate) : 0;

          this.rates.usdTry = usdTry.toFixed(2);
          this.rates.eurTry = eurTry.toFixed(2);
        }
      }
    } catch (e) {
      console.warn('Currency fetch failed:', e);
    }

    try {
      // 2. Fetch BTC price from Binance public API
      const resCrypto = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
      if (resCrypto.ok) {
        const cryptoData = await resCrypto.json();
        if (cryptoData && cryptoData.price) {
          const btc = parseFloat(cryptoData.price);
          this.rates.btcUsd = btc.toLocaleString('en-US', { maximumFractionDigits: 0 });
        }
      }
    } catch (e) {
      console.warn('Crypto fetch failed:', e);
    }

    // Save and render
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(this.rates));
    } catch (e) {}
    this.render();
  }

  render() {
    if (!this.containerEl) return;
    this.containerEl.innerHTML = `
      <div class="finance-pill" title="Dolar / Türk Lirası">
        <span class="fin-sym">USD</span>
        <span class="fin-val">₺${this.rates.usdTry ?? '--'}</span>
      </div>
      <div class="finance-pill" title="Euro / Türk Lirası">
        <span class="fin-sym">EUR</span>
        <span class="fin-val">₺${this.rates.eurTry ?? '--'}</span>
      </div>
      <div class="finance-pill" title="Bitcoin / USDT">
        <span class="fin-sym">BTC</span>
        <span class="fin-val">$${this.rates.btcUsd ?? '--'}</span>
      </div>
    `;
  }
}

window.financeManager = new FinanceManager();
