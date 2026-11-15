# Oyuncak (Gece Bahçesi) — Kapsamlı Kod Tabanı Denetim ve Güvenlik Raporu

**Rapor Tarihi:** 15 Kasım 2026  
**Denetim Kapsamı:** Frontend (`src/`), Cloud Functions (`functions/`), Firestore Güvenlik Kuralları (`firestore.rules`), Test Paketleri (`tests/`), CI/CD İş Akışları (`.github/workflows/`), Derleme ve Altyapı Yapılandırmaları (`package.json`, `tsconfig*.json`, `vite.config.ts`, `firebase.json`, `public/`).  
**Denetim Modu:** Salt-okunur (Read-only) Statik ve Dinamik Analiz  
**Hedef Kitle:** Yazılım Mimarları, Kıdemli Geliştiriciler, Güvenlik ve DevOps Ekipleri  

---

## İçindekiler
1. [Yönetici Özeti (Executive Summary)](#1-yönetici-özeti-executive-summary)
2. [Bulguların Özet Matrisi (33 Bulgu)](#2-bulguların-özet-matrisi-33-bulgu)
3. [Bölüm 1: Ön Yüz (Frontend) ve Kullanıcı Deneyimi Bulguları (Bulgu 1–13)](#3-bölüm-1-ön-yüz-frontend-ve-kullanıcı-deneyimi-bulguları)
4. [Bölüm 2: Arka Yüz (Backend), Güvenlik ve Firestore Kuralları Bulguları (Bulgu 14–23)](#4-bölüm-2-arka-yüz-backend-güvenlik-ve-firestore-kuralları-bulguları)
5. [Bölüm 3: Test Paketi, CI/CD ve Altyapı Bulguları (Bulgu 24–33)](#5-bölüm-3-test-paketi-cicd-ve-altyapı-bulguları)
6. [Öncelikli İyileştirme Yol Haritası (Roadmap)](#6-öncelikli-iyileştirme-yol-haritası-roadmap)
7. [Bağımsız Doğrulama ve Test Yöntemleri](#7-bağımsız-doğrulama-ve-test-yöntemleri)

---

## 1. Yönetici Özeti (Executive Summary)

### 1.1. Denetimin Amacı ve Kapsamı
Bu denetim; çocuklara yönelik reklamsız, güvenli, hafif ve çevrimdışı çalışabilen web ve mobil mini-oyun platformu **Oyuncak (Gece Bahçesi)** projesinin tüm mimari katmanlarında uçtan uca yürütülmüştür. Projenin kaynak kodlarına hiçbir müdahalede bulunulmadan (salt-okunur modda); mantık hataları, güvenlik açıkları, performans darboğazları, Firebase kota aşımı riskleri, ölü kodlar ve test altyapısı eksiklikleri tespit edilmiş ve her biri için somut kod düzeltmeleri hazırlanmıştır.

### 1.2. Metodoloji
Denetim sürecinde üç paralel araştırma dalgası icra edilmiştir:
- **Ön Yüz İncelemesi:** React 19 bileşenleri, 22 adet mini oyunun Canvas 2D/DOM çizim mantıkları, ses ve animasyon döngüleri, yerel depolama kancaları, erişilebilirlik standartları (WCAG) ve tarayıcı uyumluluğu.
- **Arka Yüz ve Güvenlik İncelemesi:** Firebase Authentication (anonim giriş mimarisi), Cloud Firestore güvenlik kuralları (`firestore.rules`), Cloud Functions (`functions/index.js`), ağ istekleri optimizasyonu ve Content Security Policy (CSP) yapılandırması.
- **Test ve Altyapı İncelemesi:** Birim testler (`node:test`), entegrasyon testleri, Playwright E2E süitleri, GitHub Actions CI/CD boru hatları, TypeScript solution yapılandırması, npm bağımlılık açıkları (`npm audit`) ve mobil derleme altyapısı (Capacitor/Android).

### 1.3. Öne Çıkan Temel Riskler ve Kritik Tespitler
Denetim sonucunda **toplam 33 bulgu** kategorize edilmiştir. Projenin üretim ortamı güvenilirliğini ve sürdürülebilirliğini doğrudan tehdit eden en kritik 4 risk şunlardır:

1. **Platform Çökmesi ve Tarayıcı Uyumsuzluğu (Bulgu 1 & Bulgu 24):**  
   `BrickBreakerGame.tsx` içerisinde çağrılan `ctx.roundRect` metodu Safari < 15.4 ve eski Android WebView sürümlerinde desteklenmediği için oyun ilk çizim anında `TypeError` ile çökmektedir. Benzer şekilde `@swc/core` eklentisinin Windows AppData dizinlerinde oluşturduğu DACL güvenlik çakışması (`ERR_SWC_NATIVE_CACHE`) nedeniyle hem yerel derleme hem de `tests/build-output.test.mjs` testi kilitlenmektedir.
2. **Spark Kota Tüketimi ve Hizmet Reddi / DoS Riski (Bulgu 14 & Bulgu 16):**  
   Firestore güvenlik kurallarındaki bir istisna mantığı (`firestore.rules:47-49`), takma ad değişikliklerinde 10 saniyelik rate limit kısıtlamasını tamamen atlamaktadır. Anonim bir betik dakikalar içinde Spark planının günlük 20.000 yazma kotasını sıfırlayarak tüm sistemi `RESOURCE_EXHAUSTED` durumuna düşürebilir. Ayrıca profil bulunamadığında tetiklenen 26 paralel Firestore okuması (`scoreService.ts:131`), 1.000 kullanıcıda günlük 26.000 okuma harcayarak okuma kotasını felç etmektedir.
3. **Doğrudan İstemci Yazımı ve Hile Açığı (Bulgu 15):**  
   Cloud Functions kullanılmadığı için skor kayıtları doğrudan istemciden Firestore kuralları kontrolüyle yazılmaktadır. Kurallarda oyun bazlı mantıksal tavan puanlar tanımlanmadığı için kötü niyetli bir kullanıcı tüm oyunlarda doğrudan `9.999.999` skorunu liderlik tablosuna enjekte edebilmektedir.
4. **Oyun Mantığı Test Kapsamı Uçurumu (Bulgu 25):**  
   22 oyundan 16'sının karmaşık oyun kuralları (2048 matris kaydırma, Kelime Avı 8 yönlü yerleşim, Renk Sıralama tüp hacim mantığı vb.) React bileşenlerine sıkışmış durumdadır ve sıfır birim testine sahiptir.

---

## 2. Bulguların Özet Matrisi (33 Bulgu)

| # | Kategori | İlgili Dosya ve Satır | Önem Derecesi | Özet Konu |
|---|----------|----------------------|---------------|-----------|
| **1** | Frontend / Safari | `src/components/games/BrickBreakerGame.tsx:1186,1352` | **Kritik** | Korumasız `ctx.roundRect` kullanımı nedeniyle eski Safari ve WebView'larda oyunun çökmesi |
| **2** | Frontend / Mimari | `src/contexts/ProfileContext.tsx` & `src/App.tsx:33` | **Yüksek** | Tamamen kullanılmayan ölü Context (`useProfile`), avatar ve profil durumunun dağınık kalması |
| **3** | Frontend / Mantık | `src/components/games/BasketballGame.tsx:510` | **Yüksek** | Game Over anında koşulsuz `setIsNewRecord(false)` ile kazanılan yeni rekor kutlamasının ezilmesi |
| **4** | Frontend / Depolama | `src/utils/highScores.ts:48,62,92` | **Orta** | Kullanılmayan dışa aktarımlar (`setHighScore`) ve hiçbir yerde okunmayan `.obj` disk yazımları |
| **5** | Frontend / Ağ | `src/components/NicknameModal.tsx:109` & `scoreService.ts:180` | **Orta** | Mükerrer `oyuncak:nickname-changed` CustomEvent tetiklenmesi ve çift Firestore ağ sorgusu |
| **6** | Frontend / Uyumluluk | `src/components/DrawingCanvas.tsx:168` & `DrawingGallery.tsx:161` | **Orta** | DOM'a eklenmeyen `<a>` linki nedeniyle iOS Safari ve Firefox'ta resim indirme başarısızlığı |
| **7** | Frontend / Güvenlik | `src/pages/Parents.tsx:61` | **Orta** | Statik ebeveyn kapısı sorusu (`7 × 3 = 21`) nedeniyle çocukların korumalı alana kolayca erişebilmesi |
| **8** | Frontend / Performans | `src/hooks/useGameLibrary.ts:20` | **Orta** | Filtresiz global `storage` event dinleyicisi ve ilgisiz veri değişimlerinde gereksiz JSON parse |
| **9** | Frontend / Performans | `src/hooks/useLocalStorageState.ts:48` | **Orta** | `defaultValue` bağımlılığı nedeniyle inline nesne geçildiğinde her render'da gereksiz disk I/O |
| **10** | Frontend / A11y | `src/components/SuccessPopup.tsx:22-36` | **Orta** | 50ms aralıklarla 40 kez konfeti patlatılması (FPS düşmesi) ve eksik dialog erişilebilirlik öznitelikleri |
| **11** | Frontend / Mantık | `src/components/games/MathGame.tsx:93-97` | **Orta** | Yanlış seçenek oluşturma döngüsünde iterasyon sınırlayıcısı olmaması (sonsuz while döngüsü riski) |
| **12** | Frontend / Standart | `index.html:167` | **Düşük** | Kullanımdan kalkan `location.reload(true)` ve CSP ihlali oluşturan inline javascript deseni |
| **13** | Altyapı / Windows | `package.json` & `@swc/core` | **Düşük** | Windows geliştirme ortamlarında SWC önbellek DACL yetki hatası (`ERR_SWC_NATIVE_CACHE`) |
| **14** | Güvenlik / Kurallar | `firestore.rules:47-49` | **Yüksek** | 10 sn rate limit penceresinin takma ad değişikliğiyle atlatılması ve Spark yazma kotası DoS açığı |
| **15** | Güvenlik / Kurallar | `firestore.rules:28-30` & `scoreService.ts:72` | **Yüksek** | Sunucu taraflı doğrulama olmadan doğrudan istemciden keyfi skor enjeksiyonu (hile açığı) |
| **16** | Backend / Performans | `src/services/scoreService.ts:131-150` | **Yüksek** | Profil yokken 26 paralel Firestore belge okuması ve Spark okuma kotasının hızla tüketilmesi |
| **17** | Backend / Güvenlik | `functions/index.js:94-115` | **Yüksek** | `updateScoreNickname` fonksiyonunda hız sınırı olmaması ve toplu yazma (Batch Write) DoS riski |
| **18** | Güvenlik / Kurallar | `firestore.rules:31` | **Orta** | `date` alanında boyut kısıtlaması olmaması (1 MiB string ile depolama şişirme / DoS) |
| **19** | Güvenlik / Kurallar | `firestore.rules:53-61` | **Orta** | `profiles/{userId}` koleksiyonunda güncelleme hız sınırlaması (cadence) eksikliği |
| **20** | Backend / Yapılandırma | `firebase.json:5-7` & `functions/` | **Orta** | `functions/` kodunun canlı mimaride ölü kod olması ve Spark planda `firebase deploy` hatası |
| **21** | Güvenlik / Başlıklar | `firebase.json:23` & `public/_headers:3` | **Orta** | CSP `script-src` içinde `'unsafe-inline'` kullanımı ve XSS savunmasının zayıflaması |
| **22** | Backend / Veritabanı | `firestore.indexes.json` & `firebase.json` | **Orta** | Projede kod tabanlı Firestore indeks dosyasının bulunmaması (IaC eksikliği) |
| **23** | Backend / Doğrulama | `functions/scoreValidation.js:19-24` | **Düşük** | `sanitizeName` içinde surrogate pair kesilmesi (bozuk Unicode) ve eksik kontrol karakteri temizleme |
| **24** | Altyapı / Test | `tests/build-output.test.mjs:19` | **Kritik** | SWC Native eklentisi DACL hatası nedeniyle birim test ve build başarısızlığı |
| **25** | Test / Kapsam | `src/components/games/*.tsx` | **Yüksek** | 13 kritik oyunun durum makinesi ve algoritmasının bileşene gömülü ve testsiz olması |
| **26** | CI-CD / Süre | `.github/workflows/ci.yml:50-55` | **Yüksek** | CI boru hattında mükerrer Firestore emülatörü başlatılması ve test tekrarı (30-40 sn israf) |
| **27** | Altyapı / Tipler | `tsconfig.json` & `tsconfig.node.json:1-22` | **Yüksek** | Solution modunda alias (`@/*`) miras eksikliği ve E2E testlerinde kırılgan göreceli yollar |
| **28** | Bağımlılık / Güvenlik | `package.json:70,79` | **Yüksek** | `minimatch` paketinde DoS güvenlik açığı (GHSA-g3hv-75wg-m249 / CVE) |
| **29** | Test / Metodoloji | `tests/balloon-rendering.test.mjs` vb. | **Orta** | Gerçek çalışma yerine kaynak kod metninde regex arayan kırılgan test deseni |
| **30** | Test / E2E | `tests/e2e/game-starts.spec.ts:58,65` | **Orta** | 50s bloklayıcı bekleme, kırılgan sayaç kontrolü ve paralel ekran görüntüsü çakışmaları |
| **31** | Test / Kapsam | `src/services/authService.ts:1-60` | **Orta** | `authService.ts` ve kancaların izole birim test kapsamı dışında kalması |
| **32** | PWA / Varlıklar | `public/manifest.json:58-72` | **Düşük** | Web App Manifest içinde favicon dosyasının çelişkili (1024x1024 vs 192x192) tanımlanması |
| **33** | Mobil / Şablon | `android/.../ExampleUnitTest.java:1` | **Düşük** | Eski Capacitor şablon paket adı (`com.getcapacitor.myapp`) ve eski Gradle sentaksı |

---

## 3. Bölüm 1: Ön Yüz (Frontend) ve Kullanıcı Deneyimi Bulguları

Bu bölüm, kullanıcı arayüzü, oyun motorları, tarayıcı uyumluluğu, yerel durum yönetimi ve erişilebilirlik incelemelerini içermektedir.

---

### Bulgu 1: [KRİTİK] `BrickBreakerGame.tsx` — Korumasız `ctx.roundRect` Çağrısı Nedeniyle Oyunun Çökmesi
- **Önem Derecesi:** Kritik
- **Dosya Yolu ve Referans:** `src/components/games/BrickBreakerGame.tsx` (Satırlar: 1186, 1192, 1230, 1352, 1358)
- **Teknik Açıklama (Kök Neden Analizi):**  
  `BrickBreakerGame.tsx` bileşeni tuğla kırma oyununun render döngüsünde (`draw` fonksiyonu), güçlendiricileri (power-ups), lazer mermilerini ve oyuncu raketini (paddle) çizerken doğrudan `ctx.roundRect(...)` metodunu çağırmaktadır.  
  `CanvasRenderingContext2D.prototype.roundRect` API'si web standartlarına görece yeni eklenmiştir (Safari 15.4, Chrome 99, Android WebView 99). Safari 14/15.3, eski model iPad'ler veya Android 9/10 tabanlı tabletlerde çalışan gömülü tarayıcılarda `ctx.roundRect` tanımsızdır (`undefined`). Bu tarayıcılarda oyun çalıştığı anda `requestAnimationFrame` döngüsü içinde `TypeError: ctx.roundRect is not a function` hatası fırlatılır; çizim döngüsü derhal kesilir ve oyun donar.  
  İlginç bir biçimde projedeki diğer oyun motorlarında (`src/components/games/runnerRuntime.ts` ve `src/components/games/basketballRuntime.ts`) `safeRoundRect` ve `if (ctx.roundRect)` fallback mekanizmaları uygulanmışken, `BrickBreakerGame.tsx` dosyasında bu koruma tamamen unutulmuştur.
- **Etki Analizi:**  
  - *Kullanıcı Deneyimi:* Eski tablet veya telefon kullanan çocuklarda Tuğla Kırma oyunu hiçbir şekilde açılmaz, siyah/beyaz donuk ekranda kalır.
  - *Güvenilirlik:* `package.json` içerisinde hedeflenen tarayıcı yelpazesi (`browserslist`) ile fiili kod davranışı arasında uyumsuzluk yaratır.
- **Somut Kod Düzeltmesi:**  
  `BrickBreakerGame.tsx` dosyasının üst kısmına güvenli çizim polyfill'i eklenmeli ve 5 noktadaki doğrudan çağrı bu fonksiyonla değiştirilmelidir:

```typescript
// src/components/games/BrickBreakerGame.tsx içine eklenecek yardımcı fonksiyon:
function safeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
  }
}

// Satır 1186, 1192, 1230, 1352, 1358:
// ctx.roundRect(paddle.x - padW / 2, paddle.y, padW, paddle.h, 12);
// yerine:
safeRoundRect(ctx, paddle.x - padW / 2, paddle.y, padW, paddle.h, 12);
```

---

### Bulgu 2: [YÜKSEK] `ProfileContext.tsx` — Tamamen Kullanılmayan Ölü Context (Dead Code) ve Profil Durumu Ayrışması
- **Önem Derecesi:** Yüksek
- **Dosya Yolu ve Referans:** `src/contexts/ProfileContext.tsx` (Tüm dosya, 115 satır) & `src/App.tsx:33`
- **Teknik Açıklama (Kök Neden Analizi):**  
  `src/App.tsx` dosyasının 33. satırında `<ProfileProvider>` tüm bileşen ağacını sarmalamaktadır. `ProfileContext.tsx` dosyası 12 adet eğlenceli avatar tanımlamakta, profil oluşturma, takma ad ve avatar seçimi gibi zengin bir durum yönetimi sunmaktadır.  
  Ancak kod tabanında yapılan global aramada (`git grep "useProfile" src/`), `useProfile` kancasını çağıran veya import eden **tek bir bileşen dahi bulunamamıştır**.  
  Kullanıcı adı ve profil yönetimi; `src/components/home/Home.tsx`, `src/components/NicknameModal.tsx` ve `src/services/scoreService.ts` dosyalarında doğrudan `localStorage.getItem('oyuncak.nickname')` üzerinden bağımsız ve senkronizasyonsuz olarak yürütülmektedir.
- **Etki Analizi:**  
  - *Mimari:* React ağacına her render'da sıfır işlev sağlayan gereksiz bir Context sağlayıcısı eklenmiştir.
  - *Fonksiyonellik:* Projeye eklenmiş olan avatar seçimi ve çocuk dostu profil kişiselleştirme özellikleri kullanıcı arayüzünde tamamen ölü durumdadır. Takma ad güncellemeleri merkezi bir state yerine manuel `CustomEvent` dispatch'leri ile taşınmaya çalışılmaktadır.
- **Somut Kod Düzeltmesi:**  
  Profil durumu merkezi hale getirilerek `NicknameModal.tsx` ve `Home.tsx` bileşenleri `useProfile`'a bağlanmalıdır:

```tsx
// src/components/NicknameModal.tsx içinde:
import { useProfile } from '@/contexts/ProfileContext';

export default function NicknameModal({ isOpen, onClose }: NicknameModalProps) {
  const { profile, setNickname, setAvatar } = useProfile();
  const [nicknameInput, setNicknameInput] = useState(profile?.nickname || '');

  const handleSave = () => {
    const trimmed = nicknameInput.trim();
    if (trimmed) {
      setNickname(trimmed); // Tüm uygulama state'i anında güncellenir
      onClose();
    }
  };
  // ...
}
```

---

### Bulgu 3: [YÜKSEK] `BasketballGame.tsx` — Game Over Durumunda Yeni Rekor Kutlamasının Ezilmesi Mantık Hatası
- **Önem Derecesi:** Yüksek
- **Dosya Yolu ve Referans:** `src/components/games/BasketballGame.tsx` (Satırlar: 508–517)
- **Teknik Açıklama (Kök Neden Analizi):**  
  Basketbol oyununda oyuncu tur hedefini tutturamadığında oyun biter (Game Over). Satır 508–517 arasındaki mantık incelendiğinde:
  ```typescript
  // Satır 510: Koşulsuz sıfırlama
  setIsNewRecord(false);
  const finalTotal = scoreRef.current + roundScoreRef.current;
  const isNew = saveHighScoreObj('basketball', finalTotal);
  if (isNew) {
    setHighScore(finalTotal);
    setIsNewRecord(true);
  }
  ```
  Basketbol oyunu çok turlu bir oyundur. Oyuncu 1. veya 2. turda başarılı olduğunda (örneğin 150 puana ulaşıp rekor kırdığında), satır 490'daki tur tamamlama bloğunda `saveHighScoreObj` çağrılır ve localStorage'a 150 puanlık rekor kaydedilir. Oyuncu 3. turda hedefi kaçırıp elendiğinde toplam skor yine 150'dir. Satır 510'da önce `setIsNewRecord(false)` çalışır; hemen ardından satır 512'de `saveHighScoreObj('basketball', 150)` çağrılır. Ancak skor zaten 150 olduğu için `saveHighScoreObj` `score > current` şartını sağlayamaz ve `false` döner. Sonuç olarak `setIsNewRecord(true)` çalıştırılamaz ve durum kalıcı olarak `false` kalır!
- **Etki Analizi:**  
  - *Kullanıcı Deneyimi:* Çocuk o oyunda tüm zamanların en yüksek skorunu kırmış olmasına rağmen, son turda elendiğinde ekranda "Yeni Rekor!" rozetini ve kutlama konfetilerini göremez; sadece "Oyun Bitti" mesajıyla karşılaşır. Bu durum ciddi bir motivasyon kaybıdır.
- **Somut Kod Düzeltmesi:**  
  Oyun seansı boyunca rekor kırılıp kırılmadığı hafızada tutulmalı veya `isNewRecord` state'i dikkate alınmalıdır:

```typescript
// src/components/games/BasketballGame.tsx: Satır 508-518 düzeltmesi:
} else {
    // Tur başarısız - Oyun Bitti
    playErrorSound();
    const finalTotal = scoreRef.current + roundScoreRef.current;
    scoreRef.current = finalTotal;
    setTotalScore(finalTotal);

    // Eğer önceki turlarda zaten bu seans rekor kırılmışsa false'a çekilmemelidir
    const isNew = saveHighScoreObj('basketball', finalTotal);
    if (isNew || isNewRecord) {
        setHighScore(finalTotal);
        setIsNewRecord(true);
    } else {
        setIsNewRecord(false);
    }
    setPhase('gameover');
}
```

---

### Bulgu 4: [ORTA] `highScores.ts` — Kullanılmayan Dışa Aktarımlar ve Okunmayan `.obj` Disk Yazımları
- **Önem Derecesi:** Orta
- **Dosya Yolu ve Referans:** `src/utils/highScores.ts` (Satırlar: 48–60, 62–80, 92)
- **Teknik Açıklama (Kök Neden Analizi):**  
  1. `highScores.ts` dosyasında `setHighScore(gameId: string, score: number): boolean` dışa aktarılmıştır. Kod tabanında yapılan aramada hiçbir bileşenin bu fonksiyonu çağırmadığı (oyun bileşenlerindeki `setHighScore` ifadelerinin React `useState` setter'ı olduğu) tespit edilmiştir.
  2. `getHighScoreObj(gameId: string)` fonksiyonu dışa aktarılmıştır fakat hiçbir dosyada çağrılmamaktadır.
  3. `saveHighScoreObj` fonksiyonu her rekor kırıldığında `localStorage.setItem(PREFIX + gameId + '.obj', JSON.stringify({ score, date }))` anahtarına veri yazmaktadır. Ancak kod tabanında `.obj` ile biten bu anahtarları okuyan tek bir satır dahi yoktur.
- **Etki Analizi:**  
  - *Performans ve Depolama:* Mobil cihazlarda localStorage üzerinde gereksiz JSON serileştirme ve çift anahtar yazma maliyeti oluşmaktadır.
  - *Bakım Kolaylığı:* Kullanılmayan ölü API'ler geliştiriciler için kafa karışıklığı yaratmaktadır.
- **Somut Kod Düzeltmesi:**  
  Ölü fonksiyonlar temizlenmeli ve skor saklama yapısı basitleştirilmelidir:

```typescript
// src/utils/highScores.ts: Temizlenmiş ve optimize edilmiş sürüm
export function saveHighScore(gameId: string, score: number): boolean {
  if (typeof window === 'undefined') return false;
  const current = getHighScore(gameId);
  const isNew = score > current;
  if (isNew) {
    try {
      localStorage.setItem(PREFIX + gameId, String(score));
    } catch {
      // Kotası dolmuş localStorage sessizce yakalanır
    }
    if (score > 0) {
      enqueueScoreSync(gameId, score);
    }
  }
  return isNew;
}
```

---

### Bulgu 5: [ORTA] `NicknameModal.tsx` & `scoreService.ts` — Mükerrer CustomEvent ve Çift Firestore Ağ Sorgusu
- **Önem Derecesi:** Orta
- **Dosya Yolu ve Referans:** `src/components/NicknameModal.tsx` (Satır 109) & `src/services/scoreService.ts` (Satır 180)
- **Teknik Açıklama (Kök Neden Analizi):**  
  Kullanıcı takma adını değiştirdiğinde `NicknameModal.tsx:109` üzerinde şu olay tetiklenir:  
  `window.dispatchEvent(new CustomEvent('oyuncak:nickname-changed', { detail: { nickname: trimmed } }))`.  
  Hemen ardından `scoreService.updateNicknameInScores` fonksiyonu çağrılır. Bu fonksiyon Firestore üzerindeki belgeleri güncelledikten sonra satır 180'de birebir aynı olayı tekrar fırlatır:  
  `window.dispatchEvent(new CustomEvent('oyuncak:nickname-changed', { detail: { nickname: trimmed } }))`.  
  `Leaderboard.tsx` bileşeni satır 41'de bu eventi dinlemekte ve her tetiklenmede `loadLeaderboard()` fonksiyonunu çalıştırmaktadır.
- **Etki Analizi:**  
  - *Ağ ve Kota:* Kullanıcı adını her güncellediğinde Firestore veritabanına art arda iki kez ağ isteği gönderilir ve aynı liderlik tablosu iki kez çekilir. Bu durum Spark planı okuma kotasını iki kat tüketir.
- **Somut Kod Düzeltmesi:**  
  Event fırlatma sorumluluğu yalnızca tek bir noktada tutulmalı, `scoreService.ts` içindeki mükerrer dispatch kaldırılmalıdır:

```typescript
// src/services/scoreService.ts: Satır 178-182 arasından mükerrer çağrı kaldırılmalıdır:
// SİLİNECEK:
// if (typeof window !== 'undefined') {
//   window.dispatchEvent(new CustomEvent('oyuncak:nickname-changed', { detail: { nickname: trimmed } }));
// }
```

---

### Bulgu 6: [ORTA] `DrawingCanvas.tsx` & `DrawingGallery.tsx` — DOM'a Eklenmeyen `<a>` Linki Nedeniyle İndirme Başarısızlığı
- **Önem Derecesi:** Orta
- **Dosya Yolu ve Referans:** `src/components/DrawingCanvas.tsx` (Satırlar: 168–171) & `src/components/DrawingGallery.tsx` (Satırlar: 161–164)
- **Teknik Açıklama (Kök Neden Analizi):**  
  Çizim tuvalinde yapılan resmin PNG olarak cihaza indirilmesi şu kodla yapılmaktadır:
  ```typescript
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
  ```
  `link` elemanı `document.body.appendChild(link)` ile DOM ağacına bağlanmamıştır. W3C HTML ve tarayıcı güvenlik politikalarına göre (özellikle iOS Safari, Firefox ve bazı WebView sürümlerinde), DOM ağacında fiziksel olarak bulunmayan bağlantıların sentetik `.click()` çağrıları sessizce engellenir.
- **Etki Analizi:**  
  - *Kullanıcı Deneyimi:* iPad veya iPhone kullanan çocuklar çizdikleri resmi kaydetmek için "İndir" butonuna bastıklarında hiçbir işlem gerçekleşmez; resim kaydedilemez.
- **Somut Kod Düzeltmesi:**  
  Standart DOM bağlama-tıklama-kaldırma deseni uygulanmalıdır:

```typescript
// src/components/DrawingCanvas.tsx & DrawingGallery.tsx
const link = document.createElement('a');
link.download = `cizimim-${Date.now()}.png`;
link.href = canvas.toDataURL('image/png');
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
```

---

### Bulgu 7: [ORTA] `Parents.tsx` — Statik Ebeveyn Kapısı Güvenlik Zaafiyeti
- **Önem Derecesi:** Orta
- **Dosya Yolu ve Referans:** `src/pages/Parents.tsx` (Satır 61)
- **Teknik Açıklama (Kök Neden Analizi):**  
  Çocukların ebeveyn paneline yanlışlıkla girmesini engellemek için tasarlanan güvenlik kapısı sorusu sabit kodlanmıştır:
  ```tsx
  <p className="text-sm text-stone-600 mb-2">Lütfen devam etmek için işlemi çözün: 7 × 3 = ?</p>
  ```
  Cevap (`21`) sabittir; sayfa yenilense veya oturum kapatılsa bile soru değişmemektedir.
- **Etki Analizi:**  
  - *Güvenlik ve Gizlilik:* Çocuk cevabın 21 olduğunu bir defa öğrendikten veya denedikten sonra ebeveyn alanına dilediği zaman girebilir. Ebeveyn alanındaki oyun süresi sınırlarını kapatabilir, yerel verileri silebilir veya Firebase bağlantı ayarlarını manipüle edebilir.
- **Somut Kod Düzeltmesi:**  
  Bileşen her açıldığında rastgele iki sayının çarpımını üreten dinamik bir kapı mekanizması kurulmalıdır:

```tsx
// src/pages/Parents.tsx
const [gateChallenge] = useState(() => {
  const a = Math.floor(Math.random() * 6) + 4; // 4 - 9 arası
  const b = Math.floor(Math.random() * 6) + 3; // 3 - 8 arası
  return { text: `${a} × ${b} = ?`, expected: a * b };
});

// Doğrulama anında:
if (parseInt(answer.trim(), 10) === gateChallenge.expected) {
  setIsUnlocked(true);
}
```

---

### Bulgu 8: [ORTA] `useGameLibrary.ts` — Filtresiz Global Storage Olayı Dinleyicisi
- **Önem Derecesi:** Orta
- **Dosya Yolu ve Referans:** `src/hooks/useGameLibrary.ts` (Satır 20)
- **Teknik Açıklama (Kök Neden Analizi):**  
  Kanca içerisinde yer alan sekme senkronizasyonu şu şekildedir:  
  `window.addEventListener('storage', () => { setLibrary(readLibrary()); });`  
  Burada `event.key === KEY` kontrolü bulunmamaktadır. Tarayıcının başka bir sekmesinde `oyuncak.muted`, `oyuncak.theme` veya `oyuncak.nickname` gibi kütüphane ile tamamen ilgisiz herhangi bir localStorage değeri değiştiğinde dahi bu dinleyici tetiklenir.
- **Etki Analizi:**  
  - *Performans:* İlgisiz her depolama değişiminde 22 oyunluk kütüphane JSON'ı baştan `JSON.parse` edilir ve kancayı dinleyen bileşenlerde gereksiz React render döngüleri oluşur.
- **Somut Kod Düzeltmesi:**  
  Event nesnesinin `key` alanı doğrulanmalıdır:

```typescript
// src/hooks/useGameLibrary.ts: Satır 20
useEffect(() => {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) {
      setLibrary(readLibrary());
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}, []);
```

---

### Bulgu 9: [ORTA] `useLocalStorageState.ts` — `defaultValue` Kaynaklı Aşırı Disk I/O ve Render Döngüsü
- **Önem Derecesi:** Orta
- **Dosya Yolu ve Referans:** `src/hooks/useLocalStorageState.ts` (Satır 48)
- **Teknik Açıklama (Kök Neden Analizi):**  
  Kancanın senkronizasyon `useEffect` bağımlılık dizisinde `[defaultValue, key, read, value]` yer almaktadır. Çağıran bir bileşen `useLocalStorageState('my-key', { count: 0 })` şeklinde inline bir obje veya dizi geçtiğinde, React her render'da yeni bir bellek referansı oluşturur. `defaultValue` bağımlılığı sürekli değiştiği için `useEffect` aralıksız tetiklenir ve disk üzerine `localStorage.setItem` çağrısı yapılır.
- **Etki Analizi:**  
  - *Performans:* Mobil cihazlarda CPU kullanımı ve disk I/O'su yükselir, pil tüketimi artar.
- **Somut Kod Düzeltmesi:**  
  `defaultValue` ilk render'da bir `useRef` içine sabitlenmeli ve bağımlılık dizisinden çıkarılmalıdır:

```typescript
// src/hooks/useLocalStorageState.ts
const defaultValueRef = useRef(defaultValue);
// useEffect içinde defaultValueRef.current kullanılır; bağımlılık [key, read, value] olarak sadeleştirilir.
```

---

### Bulgu 10: [ORTA] `SuccessPopup.tsx` — Aşırı Konfeti Döngüsü ve Eksik Dialog Erişilebilirliği (A11y)
- **Önem Derecesi:** Orta
- **Dosya Yolu ve Referans:** `src/components/SuccessPopup.tsx` (Satırlar: 22–36)
- **Teknik Açıklama (Kök Neden Analizi):**  
  Popup açıldığında 50ms aralıklarla 2000ms boyunca (toplam 40 kez) aralıksız `fireConfetti` fonksiyonu çağrılmaktadır. Her çağrı canvas üzerine onlarca parçacık çizmekte ve DOM animasyonu başlatmaktadır. Ayrıca açılan modal penceresinde `role="dialog"`, `aria-modal="true"`, `aria-labelledby` öznitelikleri ve Escape tuşuyla kapatma desteği bulunmamaktadır.
- **Etki Analizi:**  
  - *Performans:* Düşük donanımlı mobil cihazlarda 40 eşzamanlı konfeti patlaması ciddi FPS düşüşüne (frame drop) ve ekran donmasına yol açar.
  - *Erişilebilirlik:* Ekran okuyucu (screen reader) kullanan kullanıcılar için pencere odağı kaybolur.
- **Somut Kod Düzeltmesi:**  
  Konfeti açılışta 1 veya 2 güçlü patlama ile sınırlandırılmalı, dialog erişilebilirlik öznitelikleri eklenmelidir:

```tsx
// src/components/SuccessPopup.tsx
useEffect(() => {
  if (isOpen) {
    fireConfetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
  }
}, [isOpen]);

// JSX dönüşünde:
<div role="dialog" aria-modal="true" aria-labelledby="success-title" className="...">
  <h2 id="success-title" className="text-xl font-bold">Tebrikler!</h2>
</div>
```

---

### Bulgu 11: [ORTA] `MathGame.tsx` — Yanlış Seçenek Üretiminde Sınırsız While Döngüsü Riski
- **Önem Derecesi:** Orta
- **Dosya Yolu ve Referans:** `src/components/games/MathGame.tsx` (Satırlar: 93–97)
- **Teknik Açıklama (Kök Neden Analizi):**  
  Matematik oyununda doğru cevaba ek olarak 3 adet yanlış şık üretilmektedir:
  ```typescript
  while (wrongAnswers.length < 3) {
    const wrong = answer + (Math.floor(Math.random() * 10) - 5);
    if (wrong !== answer && wrong >= 0 && !wrongAnswers.includes(wrong)) {
      wrongAnswers.push(wrong);
    }
  }
  ```
  Satır 79'daki alternatif modda `fillAttempts < 10` koruması varken, satır 93'teki bu ana döngüde hiçbir deneme sayısı sayacı (guard) yoktur. `answer` 0 veya 1 gibi küçük bir değer olduğunda ve rastgele sayılar üst üste negatif veya mükerrer geldiğinde döngü ana iş parçacığında gereksiz yere yüzlerce kez dönebilir.
- **Etki Analizi:**  
  - *Kullanıcı Deneyimi:* Nadir uç durumlarda soru geçişinde arayüz takılması yaşanabilir.
- **Somut Kod Düzeltmesi:**  
  Maksimum 20 denemelik güvenlik sayacı ve deterministik tamamlama eklenmelidir:

```typescript
// src/components/games/MathGame.tsx: Satır 93-97 düzeltmesi:
let attempts = 0;
while (wrongAnswers.length < 3 && attempts < 20) {
  attempts++;
  const offset = Math.floor(Math.random() * 10) - 5;
  const wrong = answer + offset;
  if (wrong !== answer && wrong >= 0 && !wrongAnswers.includes(wrong)) {
    wrongAnswers.push(wrong);
  }
}
let fallbackOffset = 1;
while (wrongAnswers.length < 3) {
  wrongAnswers.push(answer + fallbackOffset++);
}
```

---

### Bulgu 12: [DÜŞÜK] `index.html` — Kullanımdan Kalkan `location.reload(true)` ve CSP İhlali
- **Önem Derecesi:** Düşük
- **Dosya Yolu ve Referans:** `index.html` (Satır 167)
- **Teknik Açıklama (Kök Neden Analizi):**  
  No-script veya hata durumunda sayfayı yenilemek için kullanılan buton:  
  `<a href="javascript:location.reload(true)" ...>` şeklindedir.  
  1. `location.reload()` fonksiyonunun boolean parametresi web standartlarında kullanımdan kaldırılmıştır (deprecated).  
  2. `href="javascript:..."` kullanımı CSP kurallarında `script-src 'unsafe-inline'` zorunluluğu doğurur.
- **Etki Analizi:**  
  Konsolda uyarı üretir ve sıkılaştırılmış CSP politikalarında butonun çalışmamasına yol açar.
- **Somut Kod Düzeltmesi:**  
  `href` yerine standart `onclick="window.location.reload()"` kullanılmalı veya harici script dinleyicisine bağlanmalıdır.

---

### Bulgu 13: [DÜŞÜK] Windows Ortamında SWC Önbellek DACL İzin Hatası
- **Önem Derecesi:** Düşük
- **Dosya Yolu ve Referans:** `package.json` (`test` ve `build` komutları)
- **Teknik Açıklama (Kök Neden Analizi):**  
  Windows geliştirme ortamlarında `@swc/core`, kullanıcının AppData dizininde DACL yetkilerini doğrulamaya çalışırken `ERR_SWC_NATIVE_CACHE` hatası vermektedir.
- **Etki Analizi:**  
  Windows işletim sisteminde yerel geliştirme yapan mühendislerde `npm run build:dev` komutunun takılmasına yol açar.
- **Somut Kod Düzeltmesi:**  
  Ortam değişkeni ile güvenli önbellek dizini atanmalıdır: `cross-env SWC_NATIVE_BINDING_CACHE=.cache/swc`.

---

## 4. Bölüm 2: Arka Yüz (Backend), Güvenlik ve Firestore Kuralları Bulguları

Bu bölüm, veritabanı güvenlik kuralları (`firestore.rules`), Cloud Functions mimarisi, kimlik doğrulama akışları ve ağ güvenliği başlıklarını içermektedir.

---

### Bulgu 14: [YÜKSEK] `firestore.rules` — 10 Saniyelik Hız Sınırının Takma Ad ile Atlatılması ve Spark Kota DoS Riski
- **Önem Derecesi:** Yüksek
- **Dosya Yolu ve Referans:** `firestore.rules` (Satırlar: 47–49) & `tests/rules/firestore.mjs:36-37`
- **Teknik Açıklama (Kök Neden Analizi):**  
  Firestore kurallarında skor güncellemesi için 10 saniyelik bir bekleme süresi şart koşulmuştur:
  ```firestore
  && (request.time >= resource.data.updatedAt + duration.value(10, 's')
    || (request.resource.data.score == resource.data.score
      && request.resource.data.name != resource.data.name));
  ```
  Buradaki mantıksal `||` koşulu; skor aynı kaldığı müddetçe sadece takma ad (`name`) değiştiğinde 10 saniyelik pencereyi **tamamen devre dışı bırakmaktadır**.  
  Nitekim `tests/rules/firestore.mjs` testinin 36-37. satırlarında bu durum doğrulanmıştır: İsim her değiştiğinde istek anında kabul edilmektedir.  
  Kötü niyetli bir istemci veya döngüsel bir betik, Firebase Auth'tan anonim token alarak iki farklı isim arasında saniyede onlarca kez güncelleme gönderebilir.
- **Etki Analizi:**  
  - *Maliyet ve Kota (DoS):* Firebase Spark (ücretsiz) planında günlük yazma limiti **20.000 adettir**. Saniyede 15 istek gönderen basit bir betik yaklaşık 20 dakikada tüm projenin günlük yazma kotasını sıfırlar (`RESOURCE_EXHAUSTED`). Sonuç olarak projedeki hiçbir gerçek kullanıcı o gün boyunca skor kaydedemez.
- **Somut Kod Düzeltmesi:**  
  İsim değişikliklerinde de kota saldırılarını engellemek adına en az 3 saniyelik bir taban süre şart koşulmalıdır:

```firestore
// firestore.rules Satır 43-49 düzeltmesi:
allow update: if isSignedInUser(userId)
  && isSupportedGame(gameId)
  && hasValidScoreData(gameId, userId)
  && request.resource.data.score >= resource.data.score
  && (
    // Gerçek skor artışlarında 10 saniye bekleme
    (request.resource.data.score > resource.data.score
      && request.time >= resource.data.updatedAt + duration.value(10, 's'))
    // Sadece isim değişikliklerinde dahi en az 3 saniye bekleme zorunluluğu
    || (request.resource.data.score == resource.data.score
      && request.resource.data.name != resource.data.name
      && request.time >= resource.data.updatedAt + duration.value(3, 's'))
  );
```

---

### Bulgu 15: [YÜKSEK] `firestore.rules` — İstemciden Doğrudan Keyfi Skor Enjeksiyonu (Hile Açığı)
- **Önem Derecesi:** Yüksek
- **Dosya Yolu ve Referans:** `firestore.rules` (Satırlar: 28–30) & `src/services/scoreService.ts` (Satır: 72)
- **Teknik Açıklama (Kök Neden Analizi):**  
  Projede ücretsiz planda kalabilmek için Cloud Functions devre dışı bırakılmış ve skor yazma işlemi doğrudan tarayıcıdan istemci SDK'sı (`setDoc`) ile gerçekleştirilmektedir.  
  `firestore.rules` dosyasındaki kural yalnızca `request.resource.data.score <= 9999999` kontrolü yapmaktadır. Herhangi bir kullanıcı tarayıcı konsolunu açıp şu kodu çalıştırabilir:
  ```javascript
  setDoc(doc(db, 'scores', 'runner', 'leaderboard', auth.currentUser.uid), {
    score: 9999999,
    name: 'Hacker',
    date: new Date().toISOString(),
    updatedAt: serverTimestamp(),
    uid: auth.currentUser.uid,
    gameId: 'runner'
  });
  ```
  Labirent (`maze`), Dörtlü Eşleştirme (`connect-four`) veya Hafıza Kartları (`memory`) gibi maksimum alınabilecek puanı belli olan oyunlarda dahi 9.999.999 puan kurallardan başarıyla geçmektedir.
- **Etki Analizi:**  
  - *Güvenilirlik:* Liderlik tablosu tüm oyunlar için saniyeler içinde tahrif edilebilir. Gerçek oyuncuların ve çocukların rekabet motivasyonu tamamen yok edilir.
- **Somut Kod Düzeltmesi:**  
  Firestore kurallarında oyun kategorilerine göre tavan puan fonksiyonu (`maxAllowedScore`) tanımlanmalıdır:

```firestore
// firestore.rules içine eklenecek fonksiyon:
function maxAllowedScore(gameId) {
  return gameId in ['maze', 'connect-four'] ? 1000
       : gameId in ['memory-3x3', 'memory-4x4', 'memory-5x5', 'memory-6x6'] ? 10000
       : gameId == '2048' ? 500000
       : 9999999;
}

// hasValidScoreData içinde:
&& request.resource.data.score <= maxAllowedScore(gameId)
```

---

### Bulgu 16: [YÜKSEK] `scoreService.ts` — Profil Yokken 26 Paralel Belge Okuma Patlaması
- **Önem Derecesi:** Yüksek
- **Dosya Yolu ve Referans:** `src/services/scoreService.ts` (Satırlar: 131–150)
- **Teknik Açıklama (Kök Neden Analizi):**  
  `getNicknameFromExistingScores` fonksiyonu kullanıcının profili henüz veritabanında oluşmamışsa, eski oyun skorlarından takma adını bulabilmek için 25 oyun koleksiyonunun tamamına aynı anda `getDoc` çağrısı atmaktadır:
  ```typescript
  const snapshots = await Promise.all(
    SCORE_GAME_IDS.map((gameId) => getDoc(doc(db, 'scores', gameId, 'leaderboard', user.uid))),
  );
  ```
  Profil sorgusuyla birlikte tek bir kullanıcı açılışında **26 adet Firestore belge okuması** harcanmaktadır.
- **Etki Analizi:**  
  - *Maliyet ve Kota:* Spark planı günlük okuma sınırı 50.000 adettir. Günde 1.000 yeni anonim kullanıcı siteye girdiğinde yalnızca bu fonksiyon **26.000 okuma** tüketir; yani günlük kota rezervinin %52'si tek bir fonksiyonla buharlaşır.
- **Somut Kod Düzeltmesi:**  
  Tüm oyunları körlemesine taramak yerine sıralı aranmalı veya en popüler 2-3 oyuna bakılarak ilk bulunan değerde sorgu kesilmelidir:

```typescript
// src/services/scoreService.ts Satır 131-150 düzeltmesi:
for (const gameId of SCORE_GAME_IDS.slice(0, 3)) {
  const snap = await getDoc(doc(db, 'scores', gameId, 'leaderboard', user.uid));
  if (snap.exists()) {
    const name = snap.data().name;
    if (typeof name === 'string' && name.trim()) return sanitizeNickname(name);
  }
}
return null;
```

---

### Bulgu 17: [YÜKSEK] `functions/index.js` — `updateScoreNickname` İçinde Hız Sınırı Olmaması ve Batch Write DoS Riski
- **Önem Derecesi:** Yüksek
- **Dosya Yolu ve Referans:** `functions/index.js` (Satırlar: 94–115)
- **Teknik Açıklama (Kök Neden Analizi):**  
  `updateScoreNickname` callable Cloud Function'ında hiçbir zaman aşımı veya hız sınırlaması (rate limit) bulunmamaktadır. Fonksiyon çağrıldığında `db.getAll(...refs)` ile 25 belge okumakta, ardından `db.batch()` ile 26 belgeye kadar toplu yazma işlemi gerçekleştirmektedir.
- **Etki Analizi:**  
  Canlıya dağıtıldığı takdirde, tek bir anonim kullanıcı bu fonksiyonu bir döngüde çağırarak hem Cloud Functions çalışma sürelerini hem de Firestore günlük kotalarını dakikalar içinde tüketebilir.
- **Somut Kod Düzeltmesi:**  
  İstemci parametresi katı doğrulanmalı ve kullanıcının profil belgesi üzerinden hız sınırlaması uygulanmalıdır:

```javascript
// functions/index.js
const profileRef = db.doc(`profiles/${uid}`);
const profileSnap = await profileRef.get();
const lastUpdated = profileSnap.data()?.updatedAt;
if (lastUpdated?.toMillis && Date.now() - lastUpdated.toMillis() < 5000) {
  throw new HttpsError('resource-exhausted', 'Lütfen takma ad değiştirmek için 5 saniye bekleyin.');
}
```

---

### Bulgu 18: [ORTA] `firestore.rules` — `date` Alanında Boyut Kısıtlaması Olmaması (Depolama İstismarı / DoS)
- **Önem Derecesi:** Orta
- **Dosya Yolu ve Referans:** `firestore.rules` (Satır: 31)
- **Teknik Açıklama (Kök Neden Analizi):**  
  `firestore.rules` içerisindeki `request.resource.data.date is string` denetiminde hiçbir karakter uzunluğu kısıtlaması bulunmamaktadır. Firestore kurallarında bir string alanın alabileceği maksimum boyut **1 MiB**'dır.  
  Kötü niyetli bir kullanıcı ISO tarih formatı yerine 1 MiB boyutunda anlamsız bir metin gönderebilir.
- **Etki Analizi:**  
  Liderlik tablosu ilk 10 kaydı çektiğinde 10 MiB'lık devasa bir payload indirilir; istemcinin belleği ve bant genişliği tükenir, Firebase giden veri transferi (egress) kotası hızla aşılır.
- **Somut Kod Düzeltmesi:**  
  `date` alanına katı ISO format uzunluk kontrolü eklenmelidir:

```firestore
// firestore.rules Satır 31 düzeltmesi:
&& request.resource.data.date is string
&& request.resource.data.date.size() >= 10
&& request.resource.data.date.size() <= 35
```

---

### Bulgu 19: [ORTA] `firestore.rules` — `profiles/{userId}` Koleksiyonunda Güncelleme Hız Sınırlaması Eksikliği
- **Önem Derecesi:** Orta
- **Dosya Yolu ve Referans:** `firestore.rules` (Satırlar: 53–61)
- **Teknik Açıklama (Kök Neden Analizi):**  
  `profiles/{userId}` kuralında `allow create, update:` işlemleri tanımlanmıştır; ancak `scores` koleksiyonunda bulunan zaman farkı kontrolü profiller için eklenmemiştir.
- **Etki Analizi:**  
  Anonim kullanıcılar profil belgelerini saniyede onlarca kez güncelleyerek günlük 20.000 yazma kotasını eritebilirler.
- **Somut Kod Düzeltmesi:**  
  `create` ve `update` kuralları ayrılarak güncelleme için en az 3 saniyelik bekleme şartı getirilmelidir:

```firestore
// firestore.rules Satır 53-61 düzeltmesi:
match /profiles/{userId} {
  allow read, delete: if isSignedInUser(userId);
  allow create: if isSignedInUser(userId)
    && request.resource.data.keys().hasOnly(['name', 'updatedAt'])
    && request.resource.data.name is string
    && request.resource.data.name.trim().size() > 0
    && request.resource.data.name.size() <= 30
    && request.resource.data.updatedAt == request.time;
  allow update: if isSignedInUser(userId)
    && request.resource.data.keys().hasOnly(['name', 'updatedAt'])
    && request.resource.data.name is string
    && request.resource.data.name.trim().size() > 0
    && request.resource.data.name.size() <= 30
    && request.resource.data.updatedAt == request.time
    && (resource.data.updatedAt == null || request.time >= resource.data.updatedAt + duration.value(3, 's'));
}
```

---

### Bulgu 20: [ORTA] `functions/` Kodunun Canlı Mimaride Ölü Kod Olması ve Spark Dağıtım Tutarsızlığı
- **Önem Derecesi:** Orta
- **Dosya Yolu ve Referans:** `firebase.json` (Satırlar: 5–7) & `tests/firestore-rules.test.mjs:39-43`
- **Teknik Açıklama (Kök Neden Analizi):**  
  `firebase.json` içerisinde `"functions": { "source": "functions" }` bloğu aktiftir. Fakat `scoreService.ts` Cloud Functions çağırmaz ve `tests/firestore-rules.test.mjs` testinde `assert.doesNotMatch(scoreServiceSource, /httpsCallable|firebase\/functions/)` ile Functions çağrılmaması garanti altına alınmıştır.  
  Firebase Spark planı Cloud Functions dağıtımını desteklemez (Blaze plan gerektirir).
- **Etki Analizi:**  
  Geliştirici veya CI ortamı `firebase deploy` çalıştırdığında Spark plan hatası alarak dağıtım kilitlenir.
- **Somut Kod Düzeltmesi:**  
  Cloud Functions kullanılmayacaksa `firebase.json` içerisinden `functions` bloğu kaldırılmalıdır.

---

### Bulgu 21: [ORTA] Güvenlik Başlıklarında (CSP) `'unsafe-inline'` Kullanımı
- **Önem Derecesi:** Orta
- **Dosya Yolu ve Referans:** `firebase.json` (Satır: 23) & `public/_headers` (Satır: 3)
- **Teknik Açıklama (Kök Neden Analizi):**  
  `script-src` başlığında `'unsafe-inline'` tanımlanmıştır. Bu kural, `index.html` dosyası içindeki tema yükleyici küçük script bloğu için eklenmiştir.
- **Etki Analizi:**  
  XSS (Cross-Site Scripting) zafiyetlerine karşı Content Security Policy'nin sağladığı koruma zayıflamaktadır.
- **Somut Kod Düzeltmesi:**  
  Inline betik harici bir `theme-loader.js` dosyasına taşınmalı veya CSP başlığına ilgili scriptin SHA-256 hash değeri eklenerek `'unsafe-inline'` tamamen kaldırılmalıdır.

---

### Bulgu 22: [ORTA] Projede `firestore.indexes.json` Eksikliği
- **Önem Derecesi:** Orta
- **Dosya Yolu ve Referans:** Proje Kök Dizini & `firebase.json`
- **Teknik Açıklama (Kök Neden Analizi):**  
  Proje kök dizininde `firestore.indexes.json` dosyası bulunmamaktadır ve `firebase.json` içerisinde tanımlı değildir.
- **Etki Analizi:**  
  İleride eklenebilecek bileşik (composite) sorgular için veritabanı indeksleri kod olarak yönetilememekte (IaC eksikliği) ve dağıtım otomasyonuna dahil edilememektedir.
- **Somut Kod Düzeltmesi:**  
  Kök dizine `firestore.indexes.json` eklenmeli ve `firebase.json`'a `"indexes": "firestore.indexes.json"` eklenmelidir.

---

### Bulgu 23: [DÜŞÜK] `functions/scoreValidation.js` — Surrogate Pair Kesilmesi ve Bozuk Unicode Riski
- **Önem Derecesi:** Düşük
- **Dosya Yolu ve Referans:** `functions/scoreValidation.js` (Satırlar: 19–24)
- **Teknik Açıklama (Kök Neden Analizi):**  
  `sanitizeName` fonksiyonunda metin kısaltması `name.slice(0, 30)` ile yapılmaktadır. JavaScript'te emojiler ve bazı özel karakterler 2 adet UTF-16 code unit (surrogate pair) kaplar. 30. karakter bir emojinin ilk yarısına denk gelirse geçersiz (unpaired surrogate) Unicode karakteri oluşur.
- **Etki Analizi:**  
  Veritabanında bozuk metinler ve liderlik tablosunda `` (replacement character) görüntülenmesi.
- **Somut Kod Düzeltmesi:**  
  Dizi parçalama `[...name].slice(0, 30).join('')` şeklinde Unicode grapheme/codepoint duyarlı yapılmalıdır.

---

## 5. Bölüm 3: Test Paketi, CI/CD ve Altyapı Bulguları

Bu bölüm, test araçları, birim ve entegrasyon test süitleri, E2E testleri, CI/CD boru hatları, derleme yapılandırmaları ve mobil altyapıyı içermektedir.

---

### Bulgu 24: [KRİTİK] SWC Native Eklentisi DACL Hatası Nedeniyle Birim Test ve Build Başarısızlığı
- **Önem Derecesi:** Kritik
- **Dosya Yolu ve Referans:** `package.json:67,91`, `vite.config.ts:2,178`, `tests/build-output.test.mjs:19-20`
- **Teknik Açıklama (Kök Neden Analizi):**  
  `vite.config.ts` dosyası `@vitejs/plugin-react-swc` paketini kullanmaktadır. Bu paket alt tarafta Rust ile derlenmiş yerel kütüphaneyi (`@swc/core`) çalıştırmaktadır. `@swc/core@1.16.13` sürümü Windows işletim sisteminde AppData dizini üzerindeki DACL (Discretionary Access Control List) izinlerini doğrularken `ERR_SWC_NATIVE_CACHE` hatası fırlatmaktadır.  
  Bu sebeple:
  1. `tests/build-output.test.mjs` testi `loadConfigFromFile` çalıştırdığında çökmekte ve `npm test` komutu doğrudan başarısız olmaktadır (`exit code: 1`).
  2. Windows ortamındaki bir geliştirici `npm run build:dev` çalıştırdığında derleme işlemi kilitlenmektedir.
- **Etki Analizi:**  
  - *Geliştirici Deneyimi ve CI:* Windows ortamında geliştirme yapan tüm ekip üyeleri için birim test süiti ve yerel derleme tamamen kırıktır.
- **Somut Kod Düzeltmesi:**  
  Native binary bağımlılığı olmayan, platform bağımsız ve kararlı `@vitejs/plugin-react` (Babel tabanlı) paketine geçilmelidir:

```diff
--- a/package.json
+++ b/package.json
@@ -64,3 +64,3 @@
     "@vitejs/plugin-legacy": "^8.2.3",
-    "@vitejs/plugin-react-swc": "^4.3.3",
+    "@vitejs/plugin-react": "^4.3.4",
     "autoprefixer": "^10.4.21",

--- a/vite.config.ts
+++ b/vite.config.ts
@@ -1,2 +1,2 @@
 import { defineConfig, loadEnv, type Plugin } from "vite";
-import react from "@vitejs/plugin-react-swc";
+import react from "@vitejs/plugin-react";
```

---

### Bulgu 25: [YÜKSEK] 13 Kritik Oyunun İş Mantığının Birim Test Kapsamı Dışında Olması
- **Önem Derecesi:** Yüksek
- **Dosya Yolu ve Referans:** `src/components/games/Game2048.tsx`, `WordSearchGame.tsx`, `ColorSortGame.tsx`, `BrickBreakerGame.tsx` vb.
- **Teknik Açıklama (Kök Neden Analizi):**  
  `gameCatalog.ts` içerisinde 22 oyun listelenmektedir. Yalnızca 6 oyunun mantığı (`*Logic.ts`) ayrıştırılmış ve test edilmiştir. Geriye kalan 16 oyundan `Game2048` (sayı kaydırma ve birleştirme kuralları), `ColorSortGame` (tüp renk aktarımı ve kazanma şartı), `WordSearchGame` (8 yönde kelime arama) gibi karmaşık algoritmalar tamamen React bileşen state'i içine hapsedilmiştir ve **sıfır birim testine** sahiptir.
- **Etki Analizi:**  
  - *Kalite ve Bakım:* Bir bileşen güncellendiğinde veya refactor edildiğinde oyun kurallarının bozulup bozulmadığı tespit edilemez. E2E testleri uç durumları yakalayamaz.
- **Somut Kod Düzeltmesi:**  
  Saf mantık fonksiyonları ayrıştırılmalı (`game2048Logic.ts`) ve birim test dosyası (`tests/game-2048-logic.test.mjs`) eklenmelidir:

```typescript
// src/components/games/game2048Logic.ts
export function slideAndMergeRow(row: number[]): { newRow: number[]; gainedScore: number; moved: boolean } {
  const filtered = row.filter(val => val !== 0);
  const result: number[] = [];
  let score = 0;
  let skip = false;

  for (let i = 0; i < filtered.length; i++) {
    if (skip) { skip = false; continue; }
    if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      result.push(merged);
      score += merged;
      skip = true;
    } else {
      result.push(filtered[i]);
    }
  }
  while (result.length < 4) result.push(0);
  const moved = result.some((val, idx) => val !== row[idx]);
  return { newRow: result, gainedScore: score, moved };
}
```

---

### Bulgu 26: [YÜKSEK] CI/CD Pipeline'ında Çift Firestore Emülatörü ve Test Tekrarı
- **Önem Derecesi:** Yüksek
- **Dosya Yolu ve Referans:** `.github/workflows/ci.yml` (Satırlar: 50–55) & `tests/integration/run.mjs:1-2`
- **Teknik Açıklama (Kök Neden Analizi):**  
  `.github/workflows/ci.yml` iş akışında `npm run test:rules` ve ardından `npm run test:integration` adımları çalıştırılmaktadır.  
  Her iki komut da `firebase-tools emulators:exec` ile sıfırdan emülatör başlatır.  
  Ancak `tests/integration/run.mjs` dosyasının ilk satırı `await import('../rules/firestore.mjs');` şeklindedir! Yani entegrasyon testi zaten kurallar testini kendi içinde çalıştırmaktadır.
- **Etki Analizi:**  
  - *Süre ve Kaynak:* Her CI koşumunda fazladan 30-40 saniye boyunca ikinci bir Java/Firestore emülatörü ayağa kaldırılmakta, GitHub Actions süreleri israf edilmektedir.
- **Somut Kod Düzeltmesi:**  
  `ci.yml` içerisindeki mükerrer `npm run test:rules` adımı kaldırılmalı, tek adımda birleştirilmelidir:

```yaml
# .github/workflows/ci.yml:
- name: Firestore rules and integration tests
  run: npm run test:integration
```

---

### Bulgu 27: [YÜKSEK] `tsconfig.json` Solution Modu İzolasyonu ve `tsconfig.node.json` Alias Eksikliği
- **Önem Derecesi:** Yüksek
- **Dosya Yolu ve Referans:** `tsconfig.json:1-16`, `tsconfig.node.json:1-22`, `tests/e2e/game-starts.spec.ts:3`
- **Teknik Açıklama (Kök Neden Analizi):**  
  Proje TypeScript 5+ solution modunu (`"files": []`) kullanmaktadır. Ancak alt konfigürasyon dosyaları root dosyayı `extends` etmemektedir.  
  `tsconfig.node.json` dosyasında `"paths": { "@/*": ["./src/*"] }` tanımı bulunmadığından, E2E testleri (`game-starts.spec.ts`) `@/data/gameCatalog` kullanamamakta, `../../src/data/gameCatalog` şeklinde kırılgan göreceli yollar yazmak zorunda kalmaktadır. Ayrıca `tsconfig.app.json` içinde `"noImplicitAny": false` bırakılarak tip güvenliği zayıflatılmıştır.
- **Etki Analizi:**  
  Kod tabanında import tutarsızlıkları ve dosya taşımalarında kırılmalar yaşanmaktadır.
- **Somut Kod Düzeltmesi:**  
  `tsconfig.node.json` içine path alias tanımlanmalıdır:

```json
// tsconfig.node.json:
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

### Bulgu 28: [YÜKSEK] `minimatch` Bağımlılığında DoS Güvenlik Açığı (GHSA-g3hv-75wg-m249)
- **Önem Derecesi:** Yüksek
- **Dosya Yolu ve Referans:** `package.json:70,79` & `package-lock.json`
- **Teknik Açıklama (Kök Neden Analizi):**  
  `npm audit` çalıştırıldığında `minimatch` paketinin 7.0.0 ile 11.0.0 sürümleri arasında glob eşleşmelerinde ReDoS açığı olduğu raporlanmaktadır (`GHSA-g3hv-75wg-m249`). ESLint ve typescript-eslint bu zafiyetli sürümü çekmektedir.
- **Etki Analizi:**  
  Büyük dosya taramalarında process kilitlenmesi veya aşırı CPU tüketimi riski mevcuttur.
- **Somut Kod Düzeltmesi:**  
  `package.json` içerisindeki `overrides` bloğuna güncel yamanmış sürüm zorlanmalıdır:

```json
// package.json:
"overrides": {
  "minimatch": "^10.0.1"
}
```

---

### Bulgu 29: [ORTA] Kırılgan Kaynak Kodu Regex Birim Testleri
- **Önem Derecesi:** Orta
- **Dosya Yolu ve Referans:** `tests/balloon-rendering.test.mjs:9-14`, `tests/battle-city-score.test.mjs:32-45`
- **Teknik Açıklama (Kök Neden Analizi):**  
  `balloon-rendering.test.mjs` ve `battle-city-score.test.mjs` testleri gerçek bileşenleri render etmek yerine, kaynak kod dosyalarını `fs.readFile` ile okuyup içinde regex ile kelime aramaktadır (örneğin `/contain\s*:[^;]*\bpaint\b/` veya `/postMessage\(/`).
- **Etki Analizi:**  
  Bu testler kodun gerçekte çalışıp çalışmadığını doğrulayamaz. Kod tamamen bozuk olsa bile regex geçtiği için test başarılı sayılır (false negative).
- **Somut Kod Düzeltmesi:**  
  Kaynak kod regex araması yerine gerçek DOM render veya saf durum geçiş testleri yazılmalıdır.

---

### Bulgu 30: [ORTA] E2E Testlerinde Kırılgan Zamanlayıcılar, 50s Bloklayıcı Bekleme ve Ekran Görüntüsü Çakışması
- **Önem Derecesi:** Orta
- **Dosya Yolu ve Referans:** `tests/e2e/game-starts.spec.ts:58,65` & `tests/e2e/brick-breaker-visual.spec.ts:21`
- **Teknik Açıklama (Kök Neden Analizi):**  
  1. `game-starts.spec.ts:58` satırında `⏱️ 44s` metni birebir beklenmektedir. 1 saniyelik gecikmede sayaç 43s olduğunda test düşmektedir.  
  2. Satır 65'te oyunun bitmesi için 50 saniye boyunca statik olarak beklenmektedir (`timeout: 50_000`).  
  3. `brick-breaker-visual.spec.ts:21` satırında ekran görüntüsü sabit bir dosya yoluna (`test-results/brick-breaker-playing.png`) kaydedilmektedir. 6 paralel tarayıcı çalıştığında dosya çakışması (EBUSY) oluşmaktadır.
- **Etki Analizi:**  
  CI süresinin uzaması, testlerde rastgele başarısızlıklar (flakiness).
- **Somut Kod Düzeltmesi:**  
  Playwright fake timer (`page.clock.fastForward(50_000)`) kullanılmalı, ekran görüntüsü yolları `test.info().outputPath(...)` ile izole edilmelidir.

---

### Bulgu 31: [ORTA] `authService.ts` ve Özel Kancaların Birim Test Eksikliği
- **Önem Derecesi:** Orta
- **Dosya Yolu ve Referans:** `src/services/authService.ts:1-60`, `src/hooks/useSafeTimeouts.ts`
- **Teknik Açıklama (Kök Neden Analizi):**  
  `authService.ts` dosyasındaki 8 saniyelik zaman aşımı (`withTimeout`), promise yarış engellemesi ve hata yönetimi mekanizmaları izole birim testine sahip değildir; entegrasyon testlerinde bu servis tamamen sahte mock ile ezilmektedir.
- **Etki Analizi:**  
  Yavaş ağ koşullarında kimlik doğrulama zaman aşımı mantığının nasıl davrandığı garanti edilemez.
- **Somut Kod Düzeltmesi:**  
  `tests/auth-service.test.mjs` birim testi eklenerek zaman aşımı ve hata durumları izole test edilmelidir.

---

### Bulgu 32: [DÜŞÜK] `public/manifest.json` İçinde Çelişkili İkon Boyut Bildirimi
- **Önem Derecesi:** Düşük
- **Dosya Yolu ve Referans:** `public/manifest.json` (Satırlar: 58–72)
- **Teknik Açıklama (Kök Neden Analizi):**  
  `manifest.json` dosyasında `favicon.png` ana listede 1024x1024 olarak tanımlanmışken, `shortcuts` listesinde aynı dosya için `sizes: "192x192"` beyan edilmiştir. Oysa projede `public/icon-192.png` dosyası zaten mevcuttur.
- **Etki Analizi:**  
  Lighthouse PWA denetimlerinde uyarı üretir ve gereksiz veri indirilmesine yol açar.
- **Somut Kod Düzeltmesi:**  
  Shortcuts kısmında `src: "/icon-192.png"` tanımlanmalıdır.

---

### Bulgu 33: [DÜŞÜK] Android Şablon Paketi Artığı ve Kullanımdan Kalkan Gradle Sentaksı
- **Önem Derecesi:** Düşük
- **Dosya Yolu ve Referans:** `android/app/src/test/java/com/getcapacitor/myapp/ExampleUnitTest.java:1` & `android/build.gradle:28`
- **Teknik Açıklama (Kök Neden Analizi):**  
  Android test dosyasında paket adı `com.oyuncak.app` yerine Capacitor varsayılanı `com.getcapacitor.myapp` olarak kalmıştır. `android/build.gradle` içindeki `delete rootProject.buildDir` sentaksı modern Gradle sürümlerinde kullanımdan kalkmıştır.
- **Etki Analizi:**  
  Android Studio derlemelerinde uyarılar ve şablon kirliliği.
- **Somut Kod Düzeltmesi:**  
  Paket adı `com.oyuncak.app` yapılmalı ve Gradle'da `layout.buildDirectory` kullanılmalıdır.

---

## 6. Öncelikli İyileştirme Yol Haritası (Roadmap)

Tüm bulgular iş etkisi, güvenlik riski ve uygulama eforuna göre 3 aşamalı bir yol haritasına ayrılmıştır:

```
                    ÖNCELİKLİ YOL HARİTASI
                    
  AŞAMA 1: ACİL HOTFIX       AŞAMA 2: GÜVENLİK & PERFORMANS       AŞAMA 3: TEST & ALTYAPI
  (1. - 3. Gün)              (1. - 2. Hafta)                     (2. - 4. Hafta)
┌───────────────────────┐   ┌───────────────────────────────┐   ┌─────────────────────────┐
│ • Bulgu 1: roundRect  │   │ • Bulgu 14: Rate limit fix    │   │ • Bulgu 25: 16 oyun     │
│   polyfill (Safari)   │   │ • Bulgu 15: Skor tavanı       │   │   iş mantığı testleri   │
│ • Bulgu 24: Babel     │   │ • Bulgu 16: Kör okuma önleme  │   │ • Bulgu 26: CI emülatör │
│   React plugin geçişi │   │ • Bulgu 18: date boyut kontrol│   │   optimizasyonu         │
│ • Bulgu 3: Basketbol  │   │ • Bulgu 19: Profil rate limit │   │ • Bulgu 27: tsconfig    │
│   rekor mantık fix    │   │ • Bulgu 28: minimatch override│   │   path alias düzeltmesi │
│ • Bulgu 6: Link DOM   │   │ • Bulgu 2: ProfileContext fix │   │ • Bulgu 30: E2E fake    │
│   ekleme (iOS indirme)│   │ • Bulgu 5: Çift event fix     │   │   timers geçişi         │
│ • Bulgu 7: Dinamik    │   │ • Bulgu 20: firebase.json fix │   │ • Bulgu 31: authService │
│   ebeveyn kapısı      │   │ • Bulgu 21: CSP unsafe-inline │   │   birim testleri        │
└───────────────────────┘   └───────────────────────────────┘   └─────────────────────────┘
```

### Aşama 1: Kritik Hatalar ve Kullanıcı Deneyimi Acil Müdahaleleri (1–3 Gün)
- [ ] **Bulgu 1:** `BrickBreakerGame.tsx` içine `safeRoundRect` eklenerek Safari ve eski tablet çökmeleri derhal önlenmelidir.
- [ ] **Bulgu 24:** `package.json` ve `vite.config.ts` dosyalarında `@vitejs/plugin-react` paketine geçilerek Windows derleme ve test kilitlenmesi çözülmelidir.
- [ ] **Bulgu 3:** `BasketballGame.tsx` Game Over anındaki rekor ezilme mantığı düzeltilmelidir.
- [ ] **Bulgu 6:** `DrawingCanvas.tsx` ve `DrawingGallery.tsx` indirme fonksiyonlarına `document.body.appendChild` eklenmelidir.
- [ ] **Bulgu 7:** `Parents.tsx` ebeveyn kapısı dinamik çarpma işlemine dönüştürülmelidir.

### Aşama 2: Güvenlik Sıkılaştırma, Kota Koruma ve Mimari İyileştirme (1–2 Hafta)
- [ ] **Bulgu 14, 15, 18, 19:** `firestore.rules` güncellenerek isim değişikliklerine 3 saniye süre konulmalı, oyun bazlı skor tavanı tanımlanmalı, `date` uzunluğu sınırlandırılmalı ve profil koleksiyonu hız sınırına bağlanmalıdır.
- [ ] **Bulgu 16:** `scoreService.ts` içindeki 26 paralel okuma yapan `getNicknameFromExistingScores` döngüsü optimize edilmelidir.
- [ ] **Bulgu 28:** `package.json` `overrides` bloğuna `minimatch: "^10.0.1"` eklenerek güvenlik açığı kapatılmalıdır.
- [ ] **Bulgu 2:** `ProfileContext` ile `NicknameModal` entegre edilerek ölü Context canlandırılmalıdır.
- [ ] **Bulgu 5:** `scoreService.ts` içindeki mükerrer CustomEvent tetiklemesi silinmelidir.
- [ ] **Bulgu 20, 21, 22:** `firebase.json`'dan ölü functions bloğu kaldırılmalı, CSP hash tabanlı yapılandırılmalı ve `firestore.indexes.json` eklenmelidir.

### Aşama 3: Test Paketi Olgunlaştırma ve Altyapı İyileştirmeleri (2–4 Hafta)
- [ ] **Bulgu 25:** 16 oyunun saf mantık modülleri (`*Logic.ts`) bileşenlerden ayrıştırılmalı ve birim test süitleri yazılmalıdır.
- [ ] **Bulgu 26:** CI iş akışındaki mükerrer emülatör başlatma adımı kaldırılmalıdır.
- [ ] **Bulgu 27:** `tsconfig.node.json` içine `@/*` path alias eklenmeli ve E2E testleri temizlenmelidir.
- [ ] **Bulgu 30:** E2E testlerinde 50 saniyelik statik beklemeler `page.clock` fake timer ile değiştirilmeli ve ekran görüntüsü yolları izole edilmelidir.
- [ ] **Bulgu 31:** `authService.ts` ve kancalar için izole birim test dosyaları yazılmalıdır.
- [ ] **Bulgu 32, 33:** Manifest ikon çelişkisi ve Android şablon artıkları temizlenmelidir.

---

## 7. Bağımsız Doğrulama ve Test Yöntemleri

Bu raporda sunulan 33 bulgunun doğruluğu bağımsız olarak aşağıdaki komutlar ve prosedürlerle test edilebilir:

1. **Birim Testleri ve SWC DACL Hatasını Doğrulama:**
   ```powershell
   npm test
   ```
   *Doğrulama:* `tests/build-output.test.mjs` testinin Windows ortamında `ERR_SWC_NATIVE_CACHE` hatası vererek çöktüğü, diğer 26 testin geçtiği doğrulanır.

2. **Tip ve Statik Kod Analizi (Lint):**
   ```powershell
   npm run typecheck
   npm run lint
   ```
   *Doğrulama:* Kod tabanının TypeScript ve ESLint kurallarından geçtiği; ancak `tsconfig.app.json` içinde gevşetilmiş kuralların (`noImplicitAny: false`) yer aldığı teyit edilir.

3. **Güvenlik Açığı Denetimi (`npm audit`):**
   ```powershell
   npm audit
   ```
   *Doğrulama:* `minimatch` paketiyle ilişkili 9 adet moderate seviye güvenlik açığının (`GHSA-g3hv-75wg-m249`) varlığı doğrulanır.

4. **Firestore Güvenlik Kuralları Emülatör Testi:**
   ```powershell
   npm run test:rules
   ```
   *Doğrulama:* `tests/rules/firestore.mjs:36-37` satırlarında isim değişikliğiyle 10 saniyelik rate limitin atlatıldığı ve kuralın testi başarıyla geçtiği gözlemlenir.

5. **Ağaç Taramaları ve Ölü Kod Tespiti:**
   ```powershell
   git grep "useProfile" src/
   git grep "getHighScoreObj" src/
   git grep "roundRect" src/
   ```
   *Doğrulama:* `useProfile` ve `getHighScoreObj` fonksiyonlarının tanımları dışında hiçbir yerde çağrılmadığı; `BrickBreakerGame.tsx` içinde korumasız 5 adet `roundRect` çağrısının yer aldığı doğrudan teyit edilir.

6. **Kaynak Kod Bütünlüğü Doğrulaması:**
   ```powershell
   git status
   ```
   *Doğrulama:* Projedeki hiçbir kaynak kod dosyasının değiştirilmediği, yalnızca rapor dosyasının (`DENETIM_RAPORU.md`) oluşturulduğu doğrulanır.
