/**
 * Google Account Cloud Sync Storage Wrapper
 * Utilizes chrome.storage.sync to synchronize settings, todos, notes, shortcuts, and workspaces
 * across all computers where the user is logged into their Google Chrome account.
 */

class SyncStorage {
  async get(key, defaultValue = null) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get([key], (result) => {
          if (chrome.runtime.lastError) {
            console.warn('Sync storage get error, using fallback:', chrome.runtime.lastError);
            this.getLocal(key, defaultValue).then(resolve);
          } else if (result && result[key] !== undefined) {
            resolve(result[key]);
          } else {
            // Sync'te yok: kota aşımı nedeniyle local'e yazılmış olabilecek değeri kontrol et
            this.getLocal(key, defaultValue).then(resolve);
          }
        });
      } else {
        resolve(this.getFallback(key, defaultValue));
      }
    });
  }

  async set(key, value) {
    // Keep local cache up-to-date
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}

    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            console.warn('Sync storage set error, fallback to local:', chrome.runtime.lastError);
            if (chrome.storage.local) {
              chrome.storage.local.set({ [key]: value }, () => resolve(true));
            } else {
              resolve(true);
            }
          } else {
            resolve(true);
          }
        });
      } else {
        resolve(true);
      }
    });
  }

  async remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {}

    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.remove(key, () => resolve(true));
      } else {
        resolve(true);
      }
    });
  }

  /**
   * Oversized sync verileri set() hata verince chrome.storage.local'e düştüğü için
   * okurken de local'i kontrol etmemiz gerekir; aksi halde veriler cihaz arasında kaybolur.
   */
  getLocal(key, defaultValue) {
    return new Promise((resolve) => {
      const done = (value) => {
        if (value !== undefined && value !== null) {
          resolve(value);
        } else {
          resolve(this.getFallback(key, defaultValue));
        }
      };

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([key], (result) => {
          if (!chrome.runtime.lastError && result && result[key] !== undefined) {
            done(result[key]);
          } else {
            done(null);
          }
        });
      } else {
        done(null);
      }
    });
  }

  getFallback(key, defaultValue) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }
}

window.syncStorage = new SyncStorage();
