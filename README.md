# Oyuncak — Premium Çocuk Oyun Platformu

Reklamsız, güvenli ve hızlı çocuk oyunları platformu. React + TypeScript + Tailwind CSS + Capacitor (Android) üzerine kurulu PWA.

- 21 interaktif oyun
- Serbest çizim stüdyosu
- İnteraktif hikayeler
- Firebase ile global liderlik tablosu
- Tam PWA (offline destek, yüklenebilir)
- Android APK (Capacitor)

## Gereksinimler

- Node.js **22.x** veya **24.x** (LTS)
- npm 10+
- (Android build için) Android Studio, JDK 21

## Kurulum

```bash
git clone <repo-url>
cd oyuncak
npm install
cp .env.example .env
# .env içine Firebase config'inizi yazın
npm run dev
```

Tarayıcıda `http://localhost:8080` açılır.

## Ortam Değişkenleri

`src/lib/env.ts` çalışma anında, Vite ise üretim derlemesinden önce altı zorunlu Firebase değişkenini doğrular. Eksik ayarlar derlemeyi durdurur; geliştirme ortamında açıklamalı bir hata ve yeniden deneme düğmesi görünür.

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `VITE_FIREBASE_API_KEY` | ✅ | Firebase Web API anahtarı |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ | `proje.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | ✅ | Firebase proje kimliği |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✅ | `proje.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅ | |
| `VITE_FIREBASE_APP_ID` | ✅ | |
| `VITE_FIREBASE_MEASUREMENT_ID` | ❌ | İsteğe bağlı yapılandırma; Analytics SDK etkin değildir |
| `VITE_SENTRY_DSN` | ❌ | Hata izleme. DSN + `window.Sentry` (CDN script) varsa otomatik bağlanır; yoksa sadece konsol |
| `VITE_PUBLIC_URL` | ❌ | Canonical URL, varsayılan `https://oyuncak.app` |

## Komutlar

```bash
npm run dev          # Geliştirme sunucusu
npm run build        # Üretim build (dist/)
npm run preview      # Build'i önizle
npm run lint         # ESLint
npm run typecheck    # TypeScript kontrol
npm test             # Birim testler
npm run functions:check # Cloud Functions sözdizimi kontrolü
npm run check        # lint + test + typecheck + build

# Android
npm run cap:build    # Web build + Capacitor sync
npm run apk:debug    # Debug APK üret
npm run apk:release  # Release APK (imzalı)
```

## Android Release

İmzalama yapılandırması `android/app/build.gradle` içinde tanımlıdır. Detaylar için: [`android/app/RELEASE_SIGNING.md`](./android/app/RELEASE_SIGNING.md).

Keystore değişkenleri:

- `OYUNCAK_KEYSTORE_FILE`
- `OYUNCAK_KEYSTORE_PASSWORD`
- `OYUNCAK_KEY_ALIAS`
- `OYUNCAK_KEY_PASSWORD`

## Mimari

```
src/
├── components/      # UI bileşenleri + oyunlar
│   ├── games/       # 21 oyun (Canvas + DOM)
│   ├── story/       # İnteraktif hikayeler
│   └── ui/          # shadcn/Radix bileşenleri
├── contexts/        # React Context (Theme, Profile)
├── hooks/           # Özel hook'lar
├── lib/             # env, logger, firebase
├── services/        # Firebase servisleri
├── utils/           # Saf yardımcılar
└── pages/           # Route sayfaları
```

## Güvenlik

- Firebase konfigürasyonu `.env` üzerinden (koda gömülmez)
- Skor yazımları Firestore güvenlik kurallarıyla kullanıcıya ait belgeyle sınırlandırılır
- CSP ve XSS önlemleri mevcuttur
- Takma ad istemcide temizlenir; Firestore kuralları sahiplik, alanlar, türler ve sınırları doğrular. İstemci skorunun gerçek oyundan geldiğini kanıtlamaz.

## Skor altyapısını dağıtma

Skorlar Spark planında Firestore güvenlik kuralları üzerinden çalışır. Kuralları dağıtın:

```bash
npx firebase-tools@15.29.0 deploy --only firestore:rules --project <proje-kimliği>
```

Oturum açmış kullanıcı yalnızca kendi belgesini oluşturabilir ve mevcut skorunu düşüremez.

## PWA

- `public/sw.js` — offline-first service worker
- `public/manifest.json` — install prompt
- `public/offline.html` — bağlantısız hata sayfası
- `dist/sitemap.xml` ve rota HTML dosyaları — oyun kataloğundan derlemede üretilir

## Test

```bash
npm test
```

Saf utilleri, üretim asset'lerinin varlığını ve env şema uyumunu doğrular.

## Lisans

Özel. Tüm hakları saklıdır.

## Yeni özellikler ve doğrulama

Oyun kataloğu `src/data/gameCatalog.ts` içindedir. Rotalar, skor kimlikleri, yaş/beceri/süre önerileri ve SEO bu kaynaktan türetilir. Ana sayfa kategorileri filtreye gider; favoriler ve son beş oyun cihazda tutulur.

Oyun ekranındaki duraklatma düğmesi zamanlayıcıları, Canvas döngülerini ve Tank Arena iframe'ini durdurur. Sekme arka plana geçtiğinde devam etmek için düğmeye basılır. Ebeveyn Alanı (`/parents`) skor paylaşımı, animasyon azaltma, oyun başına 15/30/45 dakikalık mola hatırlatma ve ayrı yerel/bulut silme seçenekleri içerir. Yetişkin geçişi bir kimlik doğrulama yöntemi değildir. Gizlilik ve kullanım bilgileri `/privacy` ve `/terms` rotalarındadır.

Çizimler IndexedDB içinde Blob ve küçük önizleme olarak saklanır. Eski localStorage kayıtlarının sağlam olanları aktarılır; okunamayanlar korunur ve galeriden JSON yedeği indirilebilir. Bozuk eski kayıtlar mevcut galeriyi veya yeni çizim kaydetmeyi engellemez. Yirmi çizim sınırında eski çizimler silinmez; kullanıcıdan indirmesi veya bir çizimi silmesi istenir. Tarayıcı verilerini temizlemek yine yerel çizimleri kaldırabilir.

### Ücretsiz skor yaklaşımı

Skorlar Firebase Spark, anonim Authentication ve Firestore güvenlik kurallarıyla çalışır. App Check kullanılmaz; reCAPTCHA/site anahtarı gerekmez. Ücretli hizmet veya Cloud Functions çağrısı eklenmez. Yeni rekor güncellemeleri aynı belge üzerinde en az 10 saniye aralık gerektirir; kuyruk reddedilen yazımı gecikmeli yeniden dener. Aynı skorda takma ad güncellemesi mümkündür. Sahibi skorlarını ve özel profilini silebilir.

Bu kısıt tam hile koruması değildir: istemci skor üretir; belgeyi silip yeniden oluşturmak veya yeni anonim kimlik almak aralık kuralını aşabilir. Gerçek oyun doğrulaması güvenilir sunucu mantığı gerektirir. Firestore Standard ücretsiz kotası 1 GiB veri, günlük 50.000 belge okuma, 20.000 yazma ve 20.000 silmedir (9 Eylül 2026): [resmi fiyatlandırma](https://firebase.google.com/pricing), [kotalar](https://firebase.google.com/docs/firestore/quotas), [kural testi dokümanı](https://firebase.google.com/docs/firestore/security/test-rules-emulator).

Bulut silme ekranı önceki skor gönderimini ve silme onayını ayrı ayrı en fazla 10 saniye bekler. Önceki gönderim bitmezse silme başlatılmaz. Gönderilmiş silme isteğinde zaman aşımı iptal anlamına gelmez; kullanıcıya sonucun belirsiz olduğu bildirilir. Aynı sekmede tekrar denemek bekleyen silme isteğine katılır, ikinci bir toplu silme göndermez; bekleyen silme bitene kadar yeni skor yazımları ertelenir. Yerel verileri silmek bulut bağlantısını beklemez.

**Dağıtım sırası:** Mevcut Firebase projesine önce `firestore.rules` yayımlanmalı, ardından gerçek `.env` değerleriyle web derlemesi yapılmalıdır. Yeni profil ve silme ekranları güncel kuralları gerektirir. Bu çalışma canlıya dağıtım yapmaz. CI ve uçtan uca test derlemeleri sahte demo ayarları kullanır; yayın çıktısı olarak kullanılmamalıdır.

### Ek testler

```bash
npm test                       # Saf mantık, veri aktarımı ve çevrimdışı yönlendirme
npm run typecheck              # Uygulama ve derleme yapılandırması
npx playwright install chromium
npm run test:e2e               # Masaüstü + mobil tarayıcı; demo yapılandırmasıyla derler
npm run test:rules             # Java 21 gerekli; yalnızca demo-oyuncak yerel emülatörü
```

Firebase CLI uygulamanın bağımlılığı değildir; emülatör komutu sürümü sabitlenmiş CLI'ı npx önbelleğinde çalıştırır. Windows'ta Java `Unable to establish loopback connection` hatası verirse yalnızca test süreci için `JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=C:/oyuncak-nonexistent-socket-directory` kullanılabilir; var olmayan bu dizin Java'yı TCP'ye döndürür.

Çevrimdışı kullanım için Service Worker kurulumunun bütün dosyaları indirmesi gerekir. Bir zorunlu dosya alınamazsa yeni sürüm kurulmaz ve mevcut sürüm korunur. Geliştirme sunucusunda Service Worker kaydedilmez; PWA kontrolü üretim önizlemesinde yapılır.
