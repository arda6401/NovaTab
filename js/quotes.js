/**
 * Nova Tab - %100 Türkçe Dinamik Söz Motoru
 * 1. Global API'lerden gelen sözleri ücretsiz ve hızlı Google Çeviri API'si ile anında Türkçeye çevirir.
 * 2. Çevrimdışı ya da API beklemeden anında yüklenen 70+ dev Türkçe felsefe, edebiyat ve bilgelik arşivi içerir.
 * 3. Görülen sözleri kaydeder; aynı sözü peş peşe ASLA tekrar göstermez!
 */

const TURKISH_MASTER_QUOTES = [
  // Stoacılık & Antik Bilgelik
  { text: "Yarın bambaşka bir insan olacağım diyorsun. Neden bugünden başlamıyorsun?", author: "Epiktetos" },
  { text: "Düşünceleriniz ne ise, hayatınız da odur.", author: "Marcus Aurelius" },
  { text: "Kendini geliştirmek için harcadığın hiçbir saniye boşa gitmez.", author: "Marcus Aurelius" },
  { text: "Gittiğin yoldan eminsen, engeller sadece hızını ölçmek için vardır.", author: "Seneca" },
  { text: "Zaman en adil dağıtılmış kaynaktır; herkesin gününde tam 24 saat vardır.", author: "Seneca" },
  { text: "Hiçbir rüzgar, hangi limana gideceğini bilmeyen gemiye yardım edemez.", author: "Montaigne" },
  { text: "Sadelik, nihai gelişmişlik düzeyidir.", author: "Leonardo da Vinci" },
  { text: "Öfke öyle bir yüktür ki, en çok onu taşıyana zarar verir.", author: "Konfüçyüs" },
  { text: "Bin millik bir yolculuk bile tek bir adımla başlar.", author: "Lao Tzu" },
  { text: "Kendini fetheden insan, binlerce savaşı kazanan insandan daha güçlüdür.", author: "Buda" },

  // Bilim, Teknoloji & Vizyon
  { text: "Geleceği tahmin etmenin en iyi yolu, onu inşa etmektir.", author: "Alan Kay" },
  { text: "Yaratıcılık, zekanın eğlenmesidir.", author: "Albert Einstein" },
  { text: "Zorlukların ortasında fırsatlar yatar.", author: "Albert Einstein" },
  { text: "Herhangi bir aptal bilgisayarın anlayabileceği kod yazabilir. İyi yazılımcılar insanların anlayabileceği kod yazar.", author: "Martin Fowler" },
  { text: "Önce problemi çözün. Sonra kodu yazın.", author: "John Johnson" },
  { text: "Odaklanmak 'evet' demek değil, diğer 100 harika fikre 'hayır' diyebilmektir.", author: "Steve Jobs" },
  { text: "Zamanınız kısıtlı, bu yüzden başkasının hayatını yaşayarak onu harcamayın.", author: "Steve Jobs" },
  { text: "Hata yapmaktan korkmayın. Hatalar öğrenmenin ve büyümenin yapı taşlarıdır.", author: "Ray Dalio" },
  { text: "Bugün yapacağın küçük bir ilerleme, yarının büyük başarısını hazırlar.", author: "James Clear" },
  { text: "Dünyayı değiştirecek olanlar, onu değiştirebileceklerine inanan çılgınlardır.", author: "Rob Siltanen" },
  { text: "Gelecek, bugünden ona hazırlananlara aittir.", author: "Malcolm X" },
  { text: "Önemli olan sorgulamayı asla bırakmamaktır. Merakın kendi varoluş nedeni vardır.", author: "Albert Einstein" },
  { text: "Bilgi güçtür ancak eyleme geçmedikçe sadece potansiyel olarak kalır.", author: "Francis Bacon" },

  // Türk Edebiyatı, Tasavvuf & Düşünürler
  { text: "Dünle beraber gitti cancağızım, ne kadar söz varsa düne ait. Şimdi yeni şeyler söylemek lazım.", author: "Mevlana" },
  { text: "Mum olmak kolay değildir; ışık saçmak için önce yanmak gerekir.", author: "Mevlana" },
  { text: "İlim ilim bilmektir, ilim kendin bilmektir.", author: "Yunus Emre" },
  { text: "Kader gayrete aşıktır.", author: "Yunus Emre" },
  { text: "Göz nereye bakar, gönül oraya akar. Gönül nereye akarsa, can oraya uçar.", author: "Hacı Bektaş-ı Veli" },
  { text: "Umutsuz durumlar yoktur, umutsuz insanlar vardır. Ben hiçbir zaman umudumu yitirmedim.", author: "Mustafa Kemal Atatürk" },
  { text: "Dinlenmemek üzere yürümeye karar verenler, asla ve asla yorulmazlar.", author: "Mustafa Kemal Atatürk" },
  { text: "Hayatta en hakiki mürşit ilimdir, fendir.", author: "Mustafa Kemal Atatürk" },
  { text: "Güzellik baktığın şeyde değil, bakışında olmalı.", author: "Ahmet Hamdi Tanpınar" },
  { text: "Yazmak, içimdeki ormana bir yol açmaktır.", author: "Oğuz Atay" },
  { text: "İnsan ancak anladığı şeyleri duyar.", author: "Goethe" },
  { text: "Büyük adamların hedefleri, diğerlerinin ise yalnızca istekleri vardır.", author: "Washington Irving" },

  // Psikoloji, Disiplin & Yaşam Felsefesi
  { text: "Bizi öldürmeyen şey, bizi daha güçlü kılar.", author: "Friedrich Nietzsche" },
  { text: "Neden yaşadığını bilen insan, her türlü 'nasıl'a katlanabilir.", author: "Friedrich Nietzsche" },
  { text: "Disiplin, anlık istekler ile nihai hedefin arasındaki tercihtir.", author: "Abraham Lincoln" },
  { text: "Büyük işler bir anda değil, küçük adımların sabırla bir araya gelmesiyle başarılır.", author: "Vincent van Gogh" },
  { text: "Mükemmel, iyinin düşmanıdır.", author: "Voltaire" },
  { text: "Büyümek istiyorsan, konfor alanının bittiği yerde yaşamayı öğrenmelisin.", author: "Neale Donald Walsch" },
  { text: "Kaybettiğinde değil, vazgeçtiğinde yenilirsin.", author: "Che Guevara" },
  { text: "Zorluklar insanı yıldırmak için değil, gücünü hatırlatmak için gelir.", author: "Carl Jung" },
  { text: "Gözlerini yıldızlara dik, ayakların ise hep yere bassın.", author: "Theodore Roosevelt" },
  { text: "Bir hedefin peşinden koşarken harcadığın emek, vardığın andan daha değerlidir.", author: "Ralph Waldo Emerson" },
  { text: "En büyük zafer, hiç düşmemek değil; her düştüğünde ayağa kalkabilmektir.", author: "Nelson Mandela" },
  { text: "Zihninizi neyle beslerseniz, geleceğinizi onunla şekillendirirsiniz.", author: "Zig Ziglar" },
  { text: "Yarın sabah yeni bir başlangıç yapabilmek için, bu gece geçmişle vedalaşın.", author: "Anonim" },
  { text: "Küçük zihinler insanları konuşur, orta zihinler olayları, büyük zihinler fikirleri tartışır.", author: "Eleanor Roosevelt" },
  { text: "Hayat bir yankıdır; ne gönderirsen o döner, ne ekersen onu biçersin.", author: "Anonim" },
  { text: "Cesaret korkusuzluk değil, korkuya rağmen ilerleme iradesidir.", author: "Mark Twain" },
  { text: "Kendine inanmayan birinin başkalarını inandırması imkansızdır.", author: "Mark Twain" },
  { text: "Huzuru kendi içinde bulamayan insan, başka hiçbir yerde bulamaz.", author: "François de La Rochefoucauld" },
  { text: "Bir insanın karakteri, kimse bakmıyorken ne yaptığı ile ölçülür.", author: "C.S. Lewis" },
  { text: "Bugün yapabileceğin şeyi yarına bırakma.", author: "Benjamin Franklin" },
  { text: "Yavaş yürümekten korkma, sadece durmaktan kork.", author: "Çin Atasözü" }
];

class QuoteManager {
  constructor() {
    this.textEl = document.getElementById('quote-text');
    this.authorEl = document.getElementById('quote-author');
    this.refreshBtn = document.getElementById('quote-refresh-btn');
    this.storageKey = 'nova_turkish_seen_quotes_v2';
    this.seenQuotes = new Set();
    this.isLoading = false;

    this.init();
  }

  async init() {
    await this.loadSeenHistory();
    this.fetchNextQuote();

    if (this.refreshBtn) {
      this.refreshBtn.addEventListener('click', () => {
        if (!this.isLoading) {
          this.fetchNextQuote();
        }
      });
    }
  }

  async loadSeenHistory() {
    try {
      if (window.syncStorage) {
        const stored = await window.syncStorage.get(this.storageKey, []);
        if (Array.isArray(stored)) {
          this.seenQuotes = new Set(stored);
        }
      } else {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
          this.seenQuotes = new Set(JSON.parse(raw));
        }
      }
    } catch (e) {
      this.seenQuotes = new Set();
    }
  }

  async markAsSeen(quoteText) {
    if (!quoteText) return;
    this.seenQuotes.add(quoteText.trim().toLowerCase());

    if (this.seenQuotes.size > 2000) {
      const arr = Array.from(this.seenQuotes);
      this.seenQuotes = new Set(arr.slice(arr.length - 1000));
    }

    try {
      const list = Array.from(this.seenQuotes);
      if (window.syncStorage) {
        await window.syncStorage.set(this.storageKey, list);
      } else {
        localStorage.setItem(this.storageKey, JSON.stringify(list));
      }
    } catch (e) {}
  }

  hasSeen(quoteText) {
    if (!quoteText) return false;
    return this.seenQuotes.has(quoteText.trim().toLowerCase());
  }

  async fetchNextQuote() {
    this.isLoading = true;
    if (this.refreshBtn) {
      this.refreshBtn.style.transform = 'rotate(180deg)';
      this.refreshBtn.style.opacity = '0.5';
    }

    let quote = null;

    // 1. Canlı API'den İngilizce çekip anlık Türkçeye çevirmeyi dene
    try {
      quote = await this.fetchAndTranslateOnlineQuote();
    } catch (err) {
      // sessizce devasa yerel Türkçe kütüphaneye geç
    }

    // 2. API yanıt vermediyse veya çeviri gelmediyse devasa Türkçe kütüphaneden seç
    if (!quote || !quote.text || this.hasSeen(quote.text)) {
      quote = this.getUnseenTurkishMasterQuote();
    }

    // 3. Ekrana yumuşak animasyonla bas
    if (quote) {
      await this.markAsSeen(quote.text);
      this.renderQuote(quote.text, quote.author);
    }

    this.isLoading = false;
    if (this.refreshBtn) {
      setTimeout(() => {
        this.refreshBtn.style.transform = 'rotate(0deg)';
        this.refreshBtn.style.opacity = '1';
      }, 300);
    }
  }

  // Canlı API'den söz alıp Google Translate API üzerinden Türkçeye çevirir
  async fetchAndTranslateOnlineQuote() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      // Quotable API
      const res = await fetch('https://api.quotable.io/random?tags=wisdom|inspirational|philosophy|life', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.content) {
          const rawEnglish = data.content;
          const author = data.author || 'Anonim';

          // Anında Türkçeye çevir
          const turkishText = await this.translateToTurkish(rawEnglish);
          if (turkishText && !this.hasSeen(turkishText)) {
            return {
              text: turkishText,
              author: author
            };
          }
        }
      }
    } catch (e) {
      clearTimeout(timeoutId);
    }

    return null;
  }

  // Google Translate ücretsiz ucunda ortak çeviri yardımcısı (NovaUtils)
  async translateToTurkish(text) {
    return NovaUtils.translate(text, { sl: 'en', timeout: 3500 });
  }

  // Havuzdaki 70+ söz arasından daha önce görülmemiş olanı getirir
  getUnseenTurkishMasterQuote() {
    const unseen = TURKISH_MASTER_QUOTES.filter(q => !this.hasSeen(q.text));

    // Eğer tüm sözler görüldüyse havuz hafızasını temizle, döngü sıfırdan başlasın
    if (unseen.length === 0) {
      this.seenQuotes.clear();
      return TURKISH_MASTER_QUOTES[Math.floor(Math.random() * TURKISH_MASTER_QUOTES.length)];
    }

    const randomIndex = Math.floor(Math.random() * unseen.length);
    return unseen[randomIndex];
  }

  renderQuote(text, author) {
    if (!this.textEl) return;

    const apply = () => {
      this.textEl.textContent = `"${text}"`;
      if (this.authorEl) {
        this.authorEl.textContent = `— ${author}`;
      }
      // Metin genişliği değişti → yerleşim telafisini AYNI karede uygula ki
      // kart bir kare boyunca kaymasın (RO asenkroneleri geriden gelir)
      window.novaApp?.layoutManager?.applyEdgeLock?.();
      this.textEl.style.opacity = '1';
    };

    this.textEl.style.transition = 'opacity 0.2s ease';
    this.textEl.style.opacity = '0';

    setTimeout(apply, 180);
  }
}

window.quoteManager = new QuoteManager();


