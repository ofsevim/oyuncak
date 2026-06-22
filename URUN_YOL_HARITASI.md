# Oyuncak Urun Yol Haritasi

Tarih: 2026-06-22  
Hedef: Oyuncak'i guvenilir, reklamsiz, global olcekte yayina hazir bir cocuk oyun ve yaraticilik platformuna donusturmek.

## BattleCity Karar Notu

BattleCity telifli varliklari kaldirilinca farkli bir uygulama acilmaz. Oyuncak ayni uygulama olarak kalir. BattleCity, uygulamanin icindeki tek bir mini oyun moduludur:

- React tarafi: `src/components/games/BattleCityGame.tsx`
- Public legacy oyun: `public/games/battlecity`
- Route: `/games/battle-city`
- Menu karti: `src/components/games/GamesMenu.tsx`

Telifli dosyalari dogrudan silersek uygulama genel olarak acilmaya devam eder; ancak BattleCity oyununda eksik sprite, ses, logo veya script yuzunden bozuk/eksik goruntu olusabilir. Bu nedenle telif temizligi "sadece dosyalari sil" seklinde degil, kontrollu urun karariyla yapilmali.

Onerilen karar: Once BattleCity'yi katalogdan gecici olarak gizle, sonra ozgun "Tank Arena" benzeri yeni bir oyun olarak geri getir.

### Secenek A - Gecici Gizleme

En guvenli ilk adim.

- `GamesMenu` icinden BattleCity karti kaldirilir.
- `/games/battle-city` rotasi dogrudan acilirsa oyun yerine "yenileniyor" ekrani gosterilir veya `/games` sayfasina yonlendirilir.
- `public/games/battlecity` dosyalari hemen silinmek zorunda degildir; yayina dahil edilmeyecek sekilde sonraki adimda temizlenir.

Artisi: Hizli, dusuk riskli, uygulama kirilmaz.  
Eksisi: Bir oyun gecici olarak kaybolur.

### Secenek B - Ayni Motoru Ozgun Assetlerle Korumak

Mevcut tank oyunu hissi korunur, telifli gorsel/ses/font/markalar ozgunleriyle degistirilir.

- Nintendo/Namco/Tank 1990 referanslari kaldirilir.
- Sprite, ses, font, logo ve menu metinleri ozgunlesir.
- Lisans envanteri eklenir.

Artisi: Oyun korunur.  
Eksisi: Legacy kod ve asset bagimliliklari nedeniyle ayrintili test gerekir.

### Secenek C - Yeni Tank Oyunu Yazmak

React/canvas icinde modern, ozgun ve bakimi kolay bir tank oyunu yazilir.

- Legacy iframe kalkar.
- Ortak skor, ses, input ve lifecycle sistemi kullanilir.
- Global marka icin en temiz uzun vadeli cozumdur.

Artisi: En temiz ve markaya en uygun cozum.  
Eksisi: Daha fazla gelistirme suresi ister.

## Yol Haritasi

## Faz 0 - Risk Kapatma ve Yayina Hazir Temel

Sure: 1-2 hafta  
Amac: Hukuki, guvenlik ve yayina engel riskleri kapatmak.

### 0.1 BattleCity riskini kapat

Karar: Secenek A ile basla.

Yapilacaklar:

- BattleCity kartini oyun menüsunden gizle.
- Direkt `/games/battle-city` girisinde guvenli fallback sagla.
- Public build'e BattleCity legacy dosyalarinin girip girmeyecegini kontrol et.
- Ayrica lisans envanteri dosyasi ac: `ASSET_LICENSES.md`.

Kabul kriteri:

- Uygulamadaki hicbir yerde Nintendo, Namco, Tank 1990 veya benzer telifli marka sinyali gorunmez.
- Tum route'lar kirilmadan calisir.
- `npm run lint`, `npm test`, `npm run typecheck`, `npm run build` gecer.

### 0.2 Guvenlik aciklarini kapat

Yapilacaklar:

- `npm audit` bulgulari icin kontrollu dependency guncellemesi yap.
- Ozellikle Vite ve Fabric guncellemesini test et.
- Build ve smoke testleri tekrar calistir.

Kabul kriteri:

- `npm audit --audit-level=moderate` temiz veya kabul edilmis istisna listesiyle belgelenmis olur.

### 0.3 postMessage ve iframe sertlestirme

Yapilacaklar:

- BattleCity gecici gizlense bile iframe entegrasyonu kalacaksa `origin`, `source` ve payload kontrolleri eklenir.
- `targetOrigin: '*'` kaldirilir.

Kabul kriteri:

- Disaridan gelen sahte mesaj skor yazamaz.

## Faz 1 - Guvenilir Cocuk Platformu Temeli

Sure: 2-6 hafta  
Amac: Global marka icin teknik guven ve ebeveyn guveni insa etmek.

### 1.1 Skor guvenligi

Yapilacaklar:

- Oyun bazli skor limitleri tanimla.
- Firestore rules'u oyun bazli politikalara gore daralt.
- Firebase App Check degerlendir.
- Cloud Functions ile dogrulanmis leaderboard mimarisi tasarla.
- Leaderboard'u iki moda ayir: yerel skor ve dogrulanmis global skor.

Kabul kriteri:

- Console'dan keyfi 9.999.999 skor yazmak mumkun olmaz.
- Hatalar kullaniciyi oyundan dusurmez.

### 1.2 Tek kaynakli oyun manifesti

Yapilacaklar:

- `src/data/gameManifest.ts` olustur.
- Route id, score id, title, category, icon, lazy import, SEO metni ve leaderboard politikasini tek yerde tut.
- `GamesMenu`, `featured`, `gameIds` daginikligini azalt.

Kabul kriteri:

- Yeni oyun eklemek tek manifest kaydiyla baslar.
- Consistency testi eklenir.

### 1.3 Ebeveyn ve gizlilik paketi

Yapilacaklar:

- `Parents` sayfasi: reklamsiz yapi, veri kullanimi, iletisim.
- `Privacy Policy` sayfasi: Firebase, localStorage, anonim auth, skorlar.
- `Terms` sayfasi.
- Nickname moderation stratejisi.

Kabul kriteri:

- Store ve global web yayini icin temel guven sayfalari hazir olur.

## Faz 2 - Urun Kalitesi ve Performans

Sure: 6-12 hafta  
Amac: Uygulamayi hizli, bakimi kolay ve mobilde pürüzsüz hale getirmek.

### 2.1 Buyuk oyunlari parcalama

Ilk hedef dosyalar:

- `RunnerGame.tsx`
- `DrawingCanvas.tsx`
- `BasketballGame.tsx`

Yapilacaklar:

- Input, timer, skor, ses ve lifecycle hook'larini ayir.
- Oyun durumlarini reducer veya state machine benzeri yapida toparla.
- Visibility change ve route leave cleanup standardi getir.

Kabul kriteri:

- Her buyuk oyun icin dosya sorumluluklari ayrilir.
- Timer/event listener leak riski test edilir.

### 2.2 Cizim galerisi IndexedDB'ye tasima

Yapilacaklar:

- Base64 localStorage yerine IndexedDB blob saklama.
- Kota hatasi ve temizlik akisi.
- Kucuk preview thumbnail.

Kabul kriteri:

- Mobilde 20 cizim saklamak app acilisini yavaslatmaz.

### 2.3 PWA cache stratejisi

Yapilacaklar:

- Cache gruplari: app shell, runtime images, audio, game assets.
- TTL/LRU cleanup.
- Yeni versiyon bildirimi.

Kabul kriteri:

- Offline app shell calisir.
- Cache sinirsiz buyumez.

## Faz 3 - Global Marka ve Buyume

Sure: 3-6 ay  
Amac: Oyuncak'i global pazara hazir, ozgun kimlikli ve olculebilir bir urune donusturmek.

### 3.1 i18n ve global SEO

Yapilacaklar:

- Once `tr` ve `en`.
- Rota bazli title/description/OG.
- Oyun sayfalari icin statik prerender.
- Sitemap `lastmod` ve dil alternatifleri.

Kabul kriteri:

- Her oyun kendi SEO metnine sahip olur.
- Global arama ve paylasim yuzeyi profesyonel gorunur.

### 3.2 Ozgun gorsel kimlik

Yapilacaklar:

- Oyuncak maskotu veya karakter sistemi.
- Ozgun ikon/sprite/ses kutuphanesi.
- Asset lisans envanteri.
- Store screenshot ve promo seti.

Kabul kriteri:

- Uygulamada telif belirsizligi kalmaz.
- Marka tek bakista ayirt edilir.

### 3.3 Mobil store hazirligi

Yapilacaklar:

- Android backup/FileProvider sertlestirme.
- AAB build.
- Play App Signing.
- Data Safety formu.
- Privacy/Terms URL'leri.
- Review checklist.

Kabul kriteri:

- Play Store yayin kontrol listesinden gecmeye hazir paket olusur.

## Ilk Sprint Onerisi

Sprint hedefi: Yayina engel riskleri kapatmak.

1. BattleCity'yi katalogdan gizle.
2. Direkt BattleCity route'u icin fallback ekle.
3. `ASSET_LICENSES.md` dosyasini baslat.
4. `npm audit fix` etkisini kontrollu test et.
5. postMessage sertlestirme patch'ini hazirla veya BattleCity tamamen devre disiysa sonraki sprinte at.
6. Tum kalite kapilarini calistir.

Beklenen sonuc:

- Oyuncak uygulamasi ayni kalir.
- Riskli telifli oyun kullaniciya sunulmaz.
- Geri kalan oyunlar, cizim ve hikaye akisi calismaya devam eder.
- Global marka yolunun ilk hukuki/operasyonel riski kapanir.
