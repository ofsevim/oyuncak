# Oyuncak — Premium Çocuk Oyun Platformu

Reklamsız, güvenli ve hızlı çocuk oyunları platformu. React + TypeScript + Tailwind CSS + Capacitor (Android) üzerine kurulu PWA.

- 18+ interaktif oyun
- Serbest çizim stüdyosu
- İnteraktif hikayeler
- Firebase ile global liderlik tablosu
- Tam PWA (offline destek, yüklenebilir)
- Android APK (Capacitor)

## Gereksinimler

- Node.js **20.x** veya üzeri
- npm 10+
- (Android build için) Android Studio, JDK 17

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

`src/lib/env.ts` runtime'da **zorunlu** değişkenleri doğrular; eksikse uygulama açılmaz.

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `VITE_FIREBASE_API_KEY` | ✅ | Firebase Web API anahtarı |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ | `proje.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | ✅ | Firebase proje kimliği |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✅ | `proje.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅ | |
| `VITE_FIREBASE_APP_ID` | ✅ | |
| `VITE_FIREBASE_MEASUREMENT_ID` | ❌ | Analytics için |
| `VITE_SENTRY_DSN` | ❌ | Hata izleme (boşsa sadece konsol) |
| `VITE_PUBLIC_URL` | ❌ | Canonical URL, varsayılan `https://oyuncak.app` |

## Komutlar

```bash
npm run dev          # Geliştirme sunucusu
npm run build        # Üretim build (dist/)
npm run preview      # Build'i önizle
npm run lint         # ESLint
npm run typecheck    # TypeScript kontrol
npm test             # Birim testler
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
│   ├── games/       # 18 oyun (Canvas + DOM)
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
- Güvenlik `firestore.rules` ile uygulanır
- CSP ve XSS önlemleri mevcuttur
- Kullanıcı girdileri Firestore'a prepared şekilde yazılır

## PWA

- `public/sw.js` — offline-first service worker
- `public/manifest.json` — install prompt
- `public/offline.html` — bağlantısız hata sayfası
- `public/sitemap.xml` — SEO

## Test

```bash
npm test
```

Saf utilleri, üretim asset'lerinin varlığını ve env şema uyumunu doğrular.

## Lisans

Özel. Tüm hakları saklıdır.
