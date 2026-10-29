/**
 * Weather Manager
 * Supports both Automatic GPS/IP location and Manual City Selection with Open-Meteo
 */

class WeatherManager {
  constructor() {
    this.tempEl = document.getElementById('weather-temp');
    this.descEl = document.getElementById('weather-desc');
    this.iconEl = document.getElementById('weather-icon');
    this.cacheKey = 'nova_weather_cache';
    this.prefKey = 'nova_weather_pref';

    this.autoCity = true;
    this.manualCity = '';

    this.init();
  }

  async init() {
    this.loadCachedWeather();
    await this.loadPreferences();
    this.fetchWeather();
    // Refresh weather every 30 minutes
    setInterval(() => this.fetchWeather(), 30 * 60 * 1000);
  }

  async loadPreferences() {
    try {
      let pref = null;
      if (window.syncStorage) {
        pref = await window.syncStorage.get(this.prefKey, null);
      }
      if (!pref) {
        const raw = localStorage.getItem(this.prefKey);
        if (raw) pref = JSON.parse(raw);
      }
      if (pref) {
        this.autoCity = pref.autoCity !== undefined ? pref.autoCity : true;
        this.manualCity = pref.manualCity || '';
      }

      // Ana uygulama ayarlarındaki (nova_settings) manuel şehir tercihini de destekle
      if (this.autoCity && window.syncStorage) {
        const settings = await window.syncStorage.get('nova_settings', null);
        if (settings && settings.weatherAuto === false && settings.weatherCity) {
          this.autoCity = false;
          this.manualCity = settings.weatherCity;
        }
      }
    } catch (e) {}
  }

  async setCityPreference(autoCity, manualCity) {
    this.autoCity = !!autoCity;
    this.manualCity = (manualCity || '').trim();

    const pref = { autoCity: this.autoCity, manualCity: this.manualCity };
    try {
      localStorage.setItem(this.prefKey, JSON.stringify(pref));
      if (window.syncStorage) await window.syncStorage.set(this.prefKey, pref);
    } catch (e) {}

    this.fetchWeather();
  }

  loadCachedWeather() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        this.renderWeather(data.temp, data.desc, data.code, data.city);
      }
    } catch (e) {
      console.error('Failed to load weather cache', e);
    }
  }

  async fetchWeather() {
    if (!this.autoCity && this.manualCity) {
      this.fetchByCity(this.manualCity);
      return;
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          this.fetchOpenMeteo(pos.coords.latitude, pos.coords.longitude, 'Konumunuz');
        },
        async () => {
          this.fetchByIp();
        },
        { timeout: 8000 }
      );
    } else {
      this.fetchByIp();
    }
  }

  async fetchByCity(cityName) {
    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=tr&format=json`;
      const res = await fetch(geoUrl);
      if (res.ok) {
        const data = await res.json();
        if (data && data.results && data.results.length > 0) {
          const loc = data.results[0];
          const displayCity = loc.name || cityName;
          this.fetchOpenMeteo(loc.latitude, loc.longitude, displayCity);
          return;
        }
      }
    } catch (e) {
      console.warn('City geocoding search failed:', e);
    }
    // Fallback if city not found
    this.fetchByIp();
  }

  async fetchByIp() {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const ipData = await res.json();
        this.fetchOpenMeteo(ipData.latitude, ipData.longitude, ipData.city || 'İstanbul');
      } else {
        this.fetchOpenMeteo(41.0082, 28.9784, 'İstanbul');
      }
    } catch (e) {
      this.fetchOpenMeteo(41.0082, 28.9784, 'İstanbul');
    }
  }

  async fetchOpenMeteo(lat, lon, cityName) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const current = data.current_weather;
      if (!current) return;

      const temp = Math.round(current.temperature);
      const code = current.weathercode;
      const desc = this.getWeatherDescription(code);

      this.renderWeather(temp, desc, code, cityName);

      localStorage.setItem(this.cacheKey, JSON.stringify({
        temp, desc, code, city: cityName, timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('Weather fetch error:', e);
    }
  }

  getWeatherDescription(code) {
    if (code === 0) return 'Açık & Güneşli';
    if (code === 1 || code === 2) return 'Az Bulutlu';
    if (code === 3) return 'Parçalı Bulutlu';
    if (code === 45 || code === 48) return 'Sisli';
    if (code >= 51 && code <= 55) return 'Çiseleyen Yağmur';
    if (code >= 61 && code <= 65) return 'Yağmurlu';
    if (code >= 71 && code <= 77) return 'Kar Yağışlı';
    if (code >= 80 && code <= 82) return 'Sağanak Yağış';
    if (code >= 95 && code <= 99) return 'Gök Gürültülü Fırtına';
    return 'Hafif Bulutlu';
  }

  getWeatherIconSvg(code) {
    if (code === 0) {
      return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
    } else if (code >= 1 && code <= 3) {
      return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.5 8a4.5 4.5 0 0 0-4.5 4.5c0 .28.03.55.08.81A4 4 0 0 0 7 17a4 4 0 0 0 4 4h9a4 4 0 0 0 4-4 4 4 0 0 0-3.5-3.95A4.5 4.5 0 0 0 15.5 8z"/></svg>`;
    } else if (code >= 51 && code <= 82) {
      return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>`;
    } else if (code >= 71 && code <= 77) {
      return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#e0e7ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 15h.01"/><path d="M8 19h.01"/><path d="M12 17h.01"/><path d="M12 21h.01"/><path d="M16 15h.01"/><path d="M16 19h.01"/><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/></svg>`;
    } else if (code >= 95) {
      return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#facc15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m13 12-3 5h4l-2 5"/></svg>`;
    }
    return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`;
  }

  renderWeather(temp, desc, code, city) {
    if (this.tempEl) this.tempEl.textContent = `${temp}°C`;
    if (this.descEl) this.descEl.textContent = `${city} • ${desc}`;
    if (this.iconEl) this.iconEl.innerHTML = this.getWeatherIconSvg(code);
  }
}

window.weatherManager = new WeatherManager();
