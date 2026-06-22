# Oyuncak Proje Analiz Raporu

Tarih: 2026-06-22  
Kapsam: Tum repo, `src`, PWA, Android/Capacitor, Firebase, legacy `public/games/battlecity`, kalite komutlari ve global marka stratejisi.

## Yonetici Ozeti

Oyuncak, React + TypeScript + Vite + Tailwind + Capacitor uzerine kurulu, PWA ve Android cikisi hedefleyen reklamsiz cocuk oyun/eğitim platformu. Urun hissi guclu: 18 oyun, cizim atolyesi, hikaye kutuphanesi, Firebase destekli leaderboard, offline PWA ve Android yapisi mevcut.

Mevcut teknik saglik iyi basliyor: `lint`, `test`, `typecheck` ve `build` basarili. Buna ragmen global marka seviyesine cikis icin dort kritik konu one cikiyor:

1. BattleCity/Tank 1990 icerigi telif ve marka riski tasiyor.
2. Skor sistemi istemciye guveniyor; leaderboard kolay manipule edilebilir.
3. Legacy public oyun ve PWA runtime cache stratejisi global olcekte operasyonel risk tasiyor.
4. Buyuk oyun bilesenleri tek dosyada yogunlasmis; urun buyudukce bakim maliyeti hizla artar.

En yuksek etki sirasi: telif temizligi, skor guvenligi, oyun manifesti/kimlik standardizasyonu, PWA/Android sertlestirme, rota bazli SEO ve cocuk guvenligi/uyumluluk paketi.

## Teknoloji ve Mimari Harita

- Framework: React 18, TypeScript, Vite 6, React Router.
- UI: Tailwind CSS, Framer Motion, lucide-react, Radix Tooltip, Sonner.
- Oyunlar: React bilesenleri, Canvas/DOM, Web Audio, localStorage skor.
- Cizim: Fabric.js + custom canvas brush engine.
- Backend: Firebase Auth anonim oturum, Firestore leaderboard.
- Mobil: Capacitor 8 Android.
- PWA: `public/sw.js`, `manifest.json`, offline fallback, build sonrasi `precache-manifest.json`.
- Legacy oyun: `public/games/battlecity` altinda iframe ile entegre edilen klasik JS oyun.

Ana akış:

- `src/App.tsx`: Router, provider'lar, error boundary.
- `src/pages/Index.tsx`: Tab/route secimi ve lazy sayfa yukleme.
- `src/components/games/GamesMenu.tsx`: Oyun katalogu, kategori, lazy game component routing.
- `src/utils/highScores.ts` ve `src/services/scoreService.ts`: localStorage + Firebase skor senkronizasyonu.
- `firestore.rules`: Score dokuman validasyonu.
- `vite.config.ts`: manual chunks, legacy plugin, precache manifest uretimi.

## Saglik Kontrol Sonuclari

Calistirilan komutlar:

- `npm run lint`: basarili.
- `npm test`: basarili, 6 test dosyasi gecti.
- `npm run typecheck`: basarili.
- `npm run build`: basarili.
- `npm audit --audit-level=moderate`: basarisiz cunku guvenlik aciklari var.

Audit bulgulari:

- `vite <=6.4.2`: high, Windows dev server ve UNC path kaynakli guvenlik bildirimleri.
- `fabric <7.4.0`: moderate, SVG serialization XSS bildirimi.
- `@babel/core <=7.29.0`: arbitrary file read bildirimi.
- `js-yaml <=4.1.1`: moderate DoS bildirimi.
- `tar <=7.5.15`: moderate archive parsing bildirimi.

Build performans sinyalleri:

- Modern build geciyor, lazy chunk yapisi mevcut.
- En buyuk modern chunk'lar: `drawing-vendor` yaklasik 285 kB, `firebase-firestore` yaklasik 263 kB, `react-vendor` yaklasik 166 kB, `motion-vendor` yaklasik 115 kB.
- Legacy build de uretiliyor; `polyfills-legacy` ve legacy vendor dosyalari toplam agirliga ciddi ek yapiyor.
- Browserslist verisi 6 ay eski uyarisi verdi.

## Guclu Taraflar

- Route ve oyun bazli lazy loading iyi kullanilmis.
- Runtime env validasyonu var; eksik Firebase config sessizce gecilmiyor.
- ErrorBoundary, logger, Sentry'ye opsiyonel baglanti ve global hata yakalama dusunulmus.
- PWA install, offline fallback ve service worker mevcut.
- Firestore rules alan tipi, uzunluk ve temel karakter validasyonu yapiyor.
- Testler asset, manifest icon, env example, game id consistency ve temel saf utility yuzeylerini kapsiyor.
- Android release tarafinda minify/shrink ayarlari var.
- Cocuk urunu icin reklamsiz, oyun + cizim + hikaye kombinasyonu dogru konumlanmis.

## Kritik Bulgular

### P0 - BattleCity telif ve marka riski

`public/games/battlecity` icinde `Nintendo-*` gorselleri, `namcot.png`, `copyright.png`, `Tank 1990` markalama ve NAMCO referanslari bulunuyor. Global marka, Play Store veya App Store hedefinde bu yuzey ciddi hukuki ve operasyonel risk yaratir.

Oneri:

- Bu oyunu gecici olarak katalogdan kaldir veya "legacy/private test" bayragi arkasina al.
- Ozgun tank oyunu temasi, ozgun sprite/ses/font ve net lisans dosyalariyla yeniden paketle.
- `public/games/battlecity/lib/jasmine-*` ve eski test kutuphanelerini production public assetlerinden ayir.

### P0 - Skor guvenligi ve leaderboard manipülasyonu

Skorlar client tarafinda uretilip localStorage'a ve Firestore'a yaziliyor. Firestore rules yalnizca alan formati ve genel skor ust siniri dogruluyor. Kotu niyetli kullanici console veya postMessage ile yuksek skor yazabilir.

Riskli noktalar:

- `src/utils/highScores.ts`
- `src/services/scoreService.ts`
- `src/components/games/BattleCityGame.tsx`
- `public/games/battlecity/BattleCity.html`
- `firestore.rules`

Oneri:

- Oyun bazli skor ust sinirlari belirle.
- Cloud Functions veya server-side skor dogrulama ekle.
- Firebase App Check ve rate limit stratejisi kur.
- Leaderboard'u "eglence/yerel skor" ve "dogrulanmis global skor" olarak ayir.

### P0 - iframe postMessage sertlestirme

BattleCity iframe koprusunde `targetOrigin: '*'` kullaniliyor ve parent tarafinda `origin`/`source` dogrulamasi yok.

Oneri:

- `e.source === iframeRef.current?.contentWindow` kontrolu ekle.
- Aynı origin hedefini hesaplayip `postMessage(payload, window.location.origin)` kullan.
- Payload schema dogrulamasi ekle.
- Iframe sandbox'ta `allow-same-origin` gereksinimini yeniden degerlendir veya oyunu ayri origin/subdomain'e izole et.

### P1 - Buyuk oyun dosyalari ve bakim maliyeti

En buyuk dosyalar:

- `src/components/games/RunnerGame.tsx`: 1451 satir.
- `src/components/DrawingCanvas.tsx`: 1101 satir.
- `src/components/games/BasketballGame.tsx`: 896 satir.
- `src/components/games/BalloonPopGame.tsx`: 744 satir.
- `src/components/games/PianoGame.tsx`: 733 satir.

Bu dosyalarda state, render, input, timer, ses, skor, UI ve cleanup sorumluluklari ic ice. Bu durum yeni oyun eklemeyi ve regresyonlari kontrol etmeyi zorlastirir.

Oneri:

- Oyun lifecycle standardi cikar: `idle`, `ready`, `playing`, `paused`, `gameover`, `unmounted`.
- Ortak input, ses, skor ve timer hook'lari olustur.
- Ilk refactor sirasi: `RunnerGame`, `DrawingCanvas`, `BasketballGame`.

### P1 - Oyun kimligi ve veri kaynagi daginik

Route id ve skor id farkli listelerde:

- Route: `balloon`, `whack`, `battle-city`
- Skor: `balloon-pop`, `whack-a-mole`, `battle-city`

Bu bug degil; fakat analitik, SEO, leaderboard, deep link ve icerik yonetimi buyudukce kirilgan hale gelir.

Oneri:

- Tek kaynakli `gameManifest.ts` olustur.
- Her oyun icin route id, score id, title, kategori, component lazy import, skor politikasi, SEO metadata, erişilebilirlik notu ve ikon ayni manifestte dursun.

### P1 - PWA cache buyume ve guncelleme UX riski

`public/sw.js` app shell'i cache'liyor ve diger GET assetlerinde stale-while-revalidate kullaniyor. Runtime asset cache'i icin TTL, maksimum dosya sayisi veya kota temizligi yok.

Oneri:

- Cache'leri ayir: `app-shell`, `runtime-images`, `battlecity-assets`.
- Gorsel/ses cache'i icin TTL ve LRU pruning ekle.
- Yeni surum geldiginde kullaniciya "Guncelle" akisi sun.
- Build hash manifesti ile eski runtime entry'leri temizle.

### P1 - Android/mağaza sertlestirme eksikleri

`AndroidManifest.xml` icinde `android:allowBackup="true"`. `file_paths.xml` icinde `external-path path="."` genis izin veriyor.

Oneri:

- Backup kurallarini daralt veya gerekmiyorsa backup'i kapat.
- FileProvider path'lerini yalnizca uygulamanin urettigi gerekli klasorlerle sinirla.
- AAB, Play App Signing, Play Integrity, Data Safety, Privacy Policy ve Terms URL'lerini yayina hazirla.

### P1 - SEO tek sayfa metadata ile sinirli

`index.html` canonical, OG, Twitter ve JSON-LD icin iyi temel sunuyor. Ancak sitemap oyun rotalarini listelerken her rota ayni title/meta ile donuyor.

Oneri:

- Rota bazli title/description/OG uret.
- Oyun sayfalari icin statik prerender veya SSR benzeri build adimi ekle.
- Sitemap'e `lastmod`, `changefreq`, oyun bazli aciklama stratejisi ekle.
- Global hedef icin `tr`, `en`, gerekirse `de/es/ar` i18n rotalari tasarla.

### P1 - Cocuk guvenligi, gizlilik ve uyumluluk paketi eksik

Urun cocuklara yonelik oldugu icin global marka yolunda yalniz teknik kalite yetmez. Veli guveni ve regülasyon uyumu ana marka degeridir.

Oneri:

- Veli sayfasi: reklamsiz, veri kullanimi, cocuk guvenligi, iletisim.
- Gizlilik politikasi: Firebase, Google Fonts, localStorage, anonim auth ve leaderboard aciklamalari.
- COPPA/GDPR-K perspektifi icin yas/veli onayi stratejisi.
- Nickname moderasyonu ve uygunsuz kelime filtresi.
- Analitik kullanilacaksa cocuk guvenli, minimum veri toplayan mimari.

### P2 - Cizim galerisi localStorage kotasi

`DrawingGallery` base64 PNG'leri localStorage icinde 20 adet sakliyor. Mobil cihazlarda kota, performans ve veri kaybi riski var.

Oneri:

- IndexedDB'ye gec.
- Kayit boyutu ve kota hatalari icin kullanici dostu bildirim ekle.
- PNG yerine uygun yerlerde WebP veya sikistirilmis blob sakla.

### P2 - Erişilebilirlik standardi sistematik degil

Birçok butonda `aria-label` var ve focus-visible tanimli; bu iyi. Canvas oyunlarda ise ekran okuyucu alternatifi, reduced motion, klavye esdegerleri ve canli skor duyurulari sistematik degil.

Oneri:

- Her oyun icin erişilebilirlik kontrol listesi.
- `prefers-reduced-motion` global oyun politikasi.
- Skor/zaman degisimleri icin kontrollu `aria-live`.
- Modal'larda focus trap.

## Global Marka Degeri Icin Strateji

### Konumlandirma

Oyuncak'in en guclu marka vaadi: reklamsiz, guvenli, hizli, cocuk dostu oyun ve yaraticilik alani. Bu vaadi global seviyeye tasimak icin "daha cok oyun" degil, "guvenilen cocuk platformu" dili one cikmali.

Onerilen marka sutunlari:

- Guven: reklamsiz, minimal veri, ebeveyn seffafligi.
- Kalite: hizli acilis, offline calisma, pürüzsüz mobil deneyim.
- Ogrenme: matematik, dikkat, hafiza, yaraticilik, okuma.
- Yaraticilik: cizim, hikaye, muzik, kendi uretimini saklama.
- Evrensellik: cok dil, kulturden bagimsiz karakterler ve ozgun gorsel kimlik.

### Urun Yol Haritasi

0-30 gun:

- BattleCity telifli varliklari kaldir veya oyunu gecici olarak gizle.
- `npm audit fix` etkisini kontrollu branch'te test et; Vite/Fabric aciklarini kapat.
- `gameManifest.ts` tasarimini baslat.
- postMessage origin/source dogrulamasi ekle.
- Firebase Hosting kullanilacaksa `hosting.rewrites` ekle.
- Privacy Policy, Terms ve Parents sayfasi taslaklarini hazirla.

30-90 gun:

- Skor guvenligi icin Cloud Functions/App Check/rate limit mimarisi kur.
- IndexedDB tabanli cizim galerisine gec.
- Oyun lifecycle hook'larini standartlastir.
- Rota bazli SEO/prerender ekle.
- Android backup/FileProvider sertlestirmesi yap.
- i18n temelini kur: `tr` ve `en`.

90-180 gun:

- Ozgun gorsel kimlik ve maskot/karakter sistemi gelistir.
- Ebeveyn paneli veya ebeveyn bilgi merkezi ekle.
- Oyun kalite metriği: FPS, crash-free session, completion rate, retention.
- App Store/Play Store yayin paketi: store listing, screenshots, data safety, review checklist.
- Global lokalizasyon: İngilizce once, sonra secilecek pazarlara gore yeni diller.

## Teknik Backlog Onerisi

Yuksek oncelik:

- `public/games/battlecity` telif taramasi ve ozgunlestirme.
- `src/components/games/BattleCityGame.tsx` ve `BattleCity.html` postMessage guvenligi.
- `firestore.rules` oyun bazli skor limitleri.
- `npm audit` aciklarinin kontrollu guncellenmesi.
- `gameManifest.ts` tek kaynakli oyun katalogu.

Orta oncelik:

- `RunnerGame`, `DrawingCanvas`, `BasketballGame` parcalama.
- IndexedDB cizim galerisi.
- Service worker cache TTL/pruning.
- Firebase Hosting config veya secilen hosting icin net rewrite dokumani.
- Rota bazli SEO metadata.

Düşük ama stratejik oncelik:

- Self-host font.
- CSP dokumani ve header stratejisi.
- Ekran okuyucu/reduced motion standardi.
- Play Store Data Safety ve privacy pages.
- Analitik ve deney kalitesi dashboard'u.

## Test Kapsami Onerisi

Mevcut testler saglam bir baslangic; ama global kalite icin su testler eklenmeli:

- `gameManifest` consistency testi.
- Firestore rules emulator testi.
- postMessage payload/origin testi.
- Service worker cache manifest ve offline smoke testi.
- Oyun route smoke testi: tum `/games/:gameId` rotalari render oluyor mu.
- Nickname sanitizer ve uygunsuz kelime filtresi testi.
- Manifest ikon piksel boyutu testi.
- Accessibility smoke testi: modal focus trap, aria labels, reduced motion.

## Marka ve Operasyon KPI'lari

Teknik:

- Lighthouse PWA/Performance/Accessibility/SEO: 90+ hedef.
- Initial JS modern bundle: kritik rota icin 200 kB gzip alti hedef.
- Crash-free session: %99.5+.
- Offline app shell success: %99+.

Urun:

- D1 retention.
- Oyun baslatma -> oyun bitirme orani.
- Cizim kaydetme orani.
- Hikaye tamamlama orani.
- Parent page ziyaret/guven sinyali.

Guvenlik/uyumluluk:

- Dogrulanmis leaderboard orani.
- Nickname moderation reject/approve metrikleri.
- Audit critical/high: 0.
- Lisans envanteri: tum public assetler icin kaynak/lisans kaydi.

## Sonuc

Oyuncak'in temeli iyi: uygulama calisiyor, test/build zinciri geciyor, PWA ve Android dusunulmus, oyun cesitliligi markaya enerji veriyor. Fakat global marka olma hedefinde "eglenceli prototip" ile "guvenilen cocuk platformu" arasindaki fark telif temizligi, guvenli leaderboard, tek kaynakli oyun mimarisi, erişilebilirlik, privacy ve mağaza uyumlulugunda kapanacak.

Bir sonraki en mantikli teknik adim: BattleCity riskini kapatmak ve skor guvenligini sertlestirmek. Bir sonraki en mantikli marka adimi: privacy/parents/terms sayfalarini ve ozgun gorsel kimlik/lisans envanterini tamamlamak.
