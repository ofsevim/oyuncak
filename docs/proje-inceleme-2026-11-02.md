# Proje incelemesi — 2 Kasım 2026

Tüm `src/`, `tests/`, `functions/`, `public/`, yapılandırma ve dokümanlar okundu. Lint, tip kontrolü, 29 birim test dosyası ve üretim derlemesi çalıştırıldı; dördü de geçti.

**Çalıştırılan ve geçen:** `npm run lint`, `npm run typecheck`, `npm test` (29/29), `npm run build`.
**Çalıştırılmayan:** Playwright E2E, Firestore emülatör kural testleri, entegrasyon testi, APK derlemesi.

Aşağıdaki bulgular önem sırasına göredir. Hiçbiri mevcut testler tarafından yakalanmıyor.

---

## A. Gerçek hatalar (kullanıcıyı etkiler)

### A1. CSP başlığı yok, doküman var diyor
`README.md:96` "CSP ve XSS önlemleri mevcuttur" diyordu, ama `public/_headers` yalnızca `Cache-Control` içeriyordu. `Content-Security-Policy`, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options` ve `frame-ancestors` hiçbiri tanımlı değildi. **Düzeltildi:** güvenlik başlıkları `public/_headers` ve `firebase.json` `hosting.headers` içine eklendi. `public/games/battlecity/` iframe'i `sandbox="allow-scripts allow-same-origin"` ile korunuyor; aynı origin olduğu için bu kombinasyon sandbox'ı büyük ölçüde etkisizleştirir.

### A2. 2048 skoru hızlı hamlede kayboluyor
`src/components/games/Game2048.tsx:159` `scoreRef.current + gained` kullanıyor, ama `scoreRef` yalnızca `useEffect` ile (`:116`) güncelleniyor. İki hamle tek render aralığında gelirse ikincisi eski `scoreRef` değerini okur ve ilk hamlenin puanı kaybolur. `setScore` fonksiyonel güncelleme veya `scoreRef.current = newScore` satırı gerekiyor.

### A3. Brick Breaker masaüstü genişliği pencere yeniden boyutlanınca güncellenmiyor
`src/components/games/BrickBreakerGame.tsx:79` `IS_DESKTOP_WIDE` modül yüklenirken bir kez `window.innerWidth` ile hesaplanıyor. Masaüstünde pencere 1024px altına daraltılınca 640px geniş tahta küçük alanda kalır; tersi yönde de düzelmez. Yeniden boyutlandırma dinleyicisi yok.

### A4. Oyun sayısı meta metinlerinde yanlış
`public/manifest.json` ve `index.html` OG/Twitter/JSON-LD açıklamaları "20 oyun" diyor, katalogda 21 oyun var. `src/data/pageMetadata.ts` doğru (21) — yani meta metinleri birbirinden kopuk. **Düzeltildi:** dört meta metni 21&apos;e çekildi.

Hikâye sayısı notu: gerçek sayı **32** (`adventure 5 + animals 7 + sleep 6 + learning 6 + friendship 7`; `adventure` dilimi `explorerStory`&apos;yi de içerir). `README` ve `docs/project-review.md` zaten 32 diyordu, yani bu sayı hiç yanlış değildi.

### A5. `explorer.ts` hikâyesi hiç yüklenmiyor
`src/data/stories/explorer.ts` `explorerStory` ("Minik Kaşif ve Harita") tanımlıyor, ama `src/data/stories.ts` bunu import etmiyor. Hikâye hiçbir yerde görünmüyor. Dosya tam bir hikâye içerdiği için kayıp içerik.

**Düzeltme notu:** İlk incelemede yanlış değerlendirildi. `explorer.ts`'i `stories.ts` doğrudan import etmiyor, ama `adventure.ts:2` ediyor ve `explorerStory` `adventureStories` dizisinin ilk elemanı — dolayısıyla kataloğa giriyor. Hikâye zaten görünürdü; `stories.ts`'e yapılan ekleme çift kayıt üretti ve geri alındı.

### A6. Canonical URL dağıtım adresiyle çelişiyor
`.env.local` `VITE_PUBLIC_URL=https://adenerva.netlify.app`, `netlify.toml:7` de aynı değeri sabitliyordu. Ama `index.html` canonical/OG etiketleri, `public/robots.txt` ve `public/sitemap.xml` `https://oyuncak.app` üzerine sabit. Vite eklentisi yalnızca `dist` içindeki kopyaları düzeltiyor; `public/robots.txt` ve `public/sitemap.xml` build çıktısına olduğu gibi kopyalanıp sonra üzerine yazılıyor — yani elle tutulan sürümlerle üretilen sürüm çakışıyor.

Not: `public/sitemap.xml` sanılanın aksine **tam**: 28 `<loc>` girdisiyle yedi statik rotayı ve 21 oyun rotasının tamamını içeriyor. Sorun rota eksikliği değil, sabit alan adı ve iki ayrı elle bakım yükü.

### A7. `firestore.rules` aynı skorda yazma aralığını atlatıyor
Kural, skor değişmediğinde 10 saniye beklemesini istemiyor:
```
(request.resource.data.score == resource.data.score || request.time >= resource.data.updatedAt + 10s)
```
İstemci aynı skoru tekrar tekrar göndererek `updatedAt`'i sınırsız yenileyebilir. İstemci tarafında `syncScore` `existingScore >= score` olduğunda erken dönüyor, ama `updateNicknameInScores` aynı skorda yazma yapıyor ve kural bunu sınırsız kabul ediyor.

---

## B. Ölü kod ve kullanılmayan katmanlar

| Bulgu | Kanıt |
|---|---|
| `ProfileContext` tamamen ölü | `App.tsx:33` Provider sarıyor, `useProfile` hiçbir bileşende çağrılmıyor. 12 avatarlık liste kullanılmıyor. |
| `src/data/featured.ts` ölü | `FEATURED` hiçbir bileşende import edilmiyor; yalnızca `game-id-consistency.test.mjs` kontrol ediyor. Ana sayfa kendi `picks` dizisini kullanıyor. |
| `onGoFeaturedGame` ve `oyuncak.preferredGameId` ölü | `Index.tsx:56` prop geçiyor, `Home.tsx:23` prop'u destructure etmiyor. Yazılan localStorage anahtarı hiç okunmuyor. |
| `getUserScore` kullanılmıyor | `scoreService.ts:117`; hiçbir çağrı yok. |
| `getNicknameFromExistingScores` üretimde kullanılmıyor | Yalnızca `tests/integration/score-service.mjs:101`. Takma ad başka cihazda geri yüklenmiyor. |
| `isLandscape` kullanılmıyor | Yalnızca tanımlandığı dosyada geçiyor. |
| `removeScoreSyncJob` yalnızca kendi modülünde | Dışa aktarılmış, dışarıdan çağrı yok. |
| Cloud Functions hiç çağrılmıyor | `functions/index.js` iki callable tanımlıyor, `firebase.json` functions'ı yapılandırıyor; `firestore-rules.test.mjs:39` `/httpsCallable/` olmamasını doğruluyor. Deploy edilse bile istemci kullanmıyor. |
| 11 dosyada boş import | `import {  } from "lucide-react";` — `BalloonPop`, `Basketball`, `CodingTurtle`, `Counting`, `Game2048`, `Math`, `Piano`, `Runner`, `ShapeMatch`, `SimonSays`, `SpaceShooter`, `WhackAMole`. |

---

## C. Yapısal ve tutarlılık sorunları

### C1. Dağıtım hedefi belirsiz
`netlify.toml` var, `public/_headers` ve `public/_redirects` Netlify'a özgü. `firebase.json`'da `hosting` bloğu **yoktu** — yalnızca `firestore` ve `functions`. README Firebase dağıtımını anlatıyor. Firebase Hosting'e deploy edilirse SPA fallback (`_redirects`) ve cache başlıkları (`_headers`) tamamen kaybolur; derin rotalar 404 verir. **Düzeltildi:** `firebase.json` içine `hosting` bloğu (SPA rewrite + aynı başlıklar) eklendi, README'ye dağıtım bölümü yazıldı.

### C2. Üç ayrı yerde elle tutulan oyun kimliği listesi
`src/data/gameCatalog.ts`, `firestore.rules` `isSupportedGame`, `functions/scoreValidation.js` `SCORE_GAME_IDS`. Testler `gameCatalog` ile `rules`'u karşılaştırıyor ama `scoreValidation.js` listesini hiçbiriyle karşılaştırmıyor. Yeni oyun eklendiğinde biri güncellenmezse sessiz kırılma olur.

### C3. `functions/package.json` `check` betiği eksik
`:10` yalnızca `index.js`'i denetliyor; `scoreValidation.js` atlanıyor. Kökteki `functions:check` ikisini de denetliyor ama tutarsız.

### C4. Entegrasyon testi CI'da yok
`.github/workflows/ci.yml` yalnızca `test:rules` çalıştırıyor. `npm run test:integration` (gerçek skor servisi akışı) hiçbir yerde otomatik çalışmıyor.

### C5. ESLint ignore yolu yanlış
`eslint.config.js:13` `.superpowers/**` ignore ediyor; gerçek dizin `docs/superpowers/`. Kökte `.superpowers` yok.

### C6. `tsconfig.app.json` strict'i gevşetiyor
`noImplicitAny: false`, `useUnknownInCatchVariables: false`. `catch` bloklarındaki `any` bu yüzden tip kontrolünden kaçıyor.

### C7. Brick Breaker tek dosyada 1767 satır
`runner` ve `basketball` mantığı ayrı modüllere çıkarılmış, `brick-breaker` çıkarılmamış. Aynı proje içinde tutarsız ayrıştırma.

### C8. Kök dizinde dağınık, güncelliği belirsiz dokümanlar
`PROJE_ANALIZ_RAPORU.md`, `URUN_YOL_HARITASI.md`, `ilkoku.md`, `LIVE-VERIFICATION.md`, `live-verification.json` Temmuz–Eylül tarihli; `README` ve `docs/` ile çelişiyorlar.

---

## D. Test kapsamı boşlukları

`docs/gameplay-coverage.md` zaten dürüst bir tablo tutuyor. Öne çıkanlar:

- 21 oyunun çoğunda çarpışma, can kaybı ve oyun bitişi sınanmıyor (Basketbol, Koşucu, Uzay, Tank Arena, Tetris satır temizleme).
- Bulmacaların tamamlanması ve yeniden oynatmada eski zamanlayıcıların iptali hiç test edilmiyor.
- Güçlendirmeler (Brick Breaker) ve bölüm geçişleri kapsam dışı.
- E2E testleri gerçek Firebase'e hiç dokunmuyor; ağ istekleri `route.abort()` ile kesiliyor.
- Skor kurallarının hile dayanıklılığı (belge silip yeniden oluşturma, yeni anonim kimlik) test edilmiyor; README bunu kabul ediyor.

---

## E. Doğrulama sırasında görülen olumlu noktalar

- Tip güvenliği: `src/` içinde hiç `any` yok, lint temiz.
- Skor yazımı `runTransaction` + 10 sn aralıkla, kuyruk kalıcı ve üstel geri çekilmeli; çevrimdışı davranışı tanımlı.
- Takma ad üç katmanda (istemci, Firestore kuralı, sunucu) temizleniyor.
- Erişilebilirlik: odak tuzakları, `aria-pressed`, 44px hedefler, azaltılmış hareket, `role="status"`/`alert` kullanımları yerinde.
- Service worker precache'i zorunlu dosya başarısız olursa kurulumu düşürüyor; eski sürüm korunuyor.
- Çizim migrasyonu bozuk kayıtları silmeden koruyor.
- Cihaz DPI'sına göre canvas ölçekleme ve 30/60/120 Hz'te eşit top hızı test edilmiş.

---

## Önerilen sıra

1. A1 (CSP başlıkları), A6 (canonical/dağıtım), C1 (hosting hedefi) — yayına çıkmadan önce.
2. A2, A3, A4, A5, A7 — doğrudan kullanıcı hataları.
3. C2, C3, C4 — sessiz kırılmaları önleyen yapısal düzeltmeler.
4. B listesi — ölü kod temizliği, sonra C5–C8.
5. D — önce çarpışma/can kaybı ve tamamlanma senaryoları.
