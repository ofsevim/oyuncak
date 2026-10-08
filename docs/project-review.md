# Oyuncak proje incelemesi ve Gece Bahçesi
7 Ekim 2026

## Uygulanan tasarım
20 oyun, 32 hikâye ve yerel çizim atölyesi için onaylanan Gece Bahçesi tasarımı uygulandı. Özgün SVG karakter ve her oyuna özel yerel vektör kapaklar, serif başlıklar, lavanta/nane/şeftali renkleri ve sade keşif akışları kullanıldı. Bu tasarım Awwwards estetiğini hedefler; ödül kazanıldığı iddia edilmez.

Masaüstünde üst, telefonda güvenli alanı dikkate alan alt gezinme bulunur. Açık/koyu tema tercihi kalıcıdır. Kategori, yaş ve favori filtreleri korunur. Çizim ve hikâye ekranları ortak temaya taşındı. Hafıza kartları yeni yüzeyler ve erişilebilir isimler kullanıyor. Oyun sahnelerinde sabit koyu panellere uygun renkler uygulanır; dış açık temada da skorlar okunabilir. Klavye odakları, 44px temel hedefler ve azaltılmış hareket desteği korunur.

## Oyun kodu bulguları ve düzeltmeler
- Tetris: ilk tutma sırasında tekrar tutma hakkını yanlışlıkla açan parça doğurma akışı düzeltildi. Saf geçiş, tek parçada tek tutmayı, doğru sıra tüketimini ve tutulan parçanın doğma çarpışmasını denetler.
- Yılan: büyümeden hareket ederken boşalan kuyruğa geçiş yanlış çarpışma sayılıyordu. Saf adım planlayıcı büyümeyi dikkate alır; duvar, sarma ve engeller de test edilir.
- Koşucu: büyük bileşendeki çizim ayrı renderer modülüne taşındı. Kare durumunu parametre alır, fizik durumuna yazmaz ve görsel önbelleği tekrar kullanır. Bütün karakterler çizim testinde denetlenir.
- Ortak katalog, route/score kimlikleri, lazy yükleme, duraklatma zamanlayıcıları ve skor kuyruğu korunur. Yeni modüller okunabilir biçimde düzenlendi. React Compiler etkin değil; hook sırası ve bağımlılık kontrolleri devam eder.

## Bağımlılık değerlendirmesi
| Alan | Son seçim ve gerekçe |
|---|---|
| React / React DOM | 19.3; yeni tiplerle doğrulandı |
| Vite | 8.3; legacy JavaScript çıktısı korunuyor |
| TypeScript | 6.0.3; typescript-eslint henüz 7.x desteklemiyor |
| ESLint | 10.12; Node aralığı ^22.13.0 veya >=24 |
| Tailwind | 3.4.19; mevcut eski tarayıcı hedefleri için |
| tailwind-merge | 2.6.1; Tailwind3 ile desteklenen eşleşme |
| Firebase web | 12.19; Spark istemci akışı korunuyor |
| Capacitor | 8.5.2 güvenlik yamaları; APK çalıştırılmadı |
| Firebase CLI | 15.32.1; emülatör sürümü sabit |
| Dolaylı paketler | gRPC, UUID, busboy, selector parser yamalı override'ları |

npm kilidi tek kaynak olarak tutuldu; eski bun kilidi kaldırıldı. Tailwind animasyon eklentisi yalnızca derlemede kullanıldığı için geliştirme bağımlılığına taşındı.

Üretim bağımlılıklarında **0 açık**, isteğe bağlı Functions paketinde **0 açık**.
Tam geliştirme ağacında **5 high paket kaydı** var; tümü tek yamalanmamış braces kaynağının bağımlılık zinciri. Derleme/dosya izleme araçlarında kullanılır, tarayıcıya yayımlanan oyun koduna dahil olmaz. Uyarı gizlenmedi. Yama yayımlandığında tekrar güncellenmeli.

Kaynaklar: [Tailwind tarayıcı desteği](https://tailwindcss.com/docs/upgrade-guide), [TypeScript ESLint desteği](https://typescript-eslint.io/users/dependency-versions/), [braces yama durumu](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

## Firebase ve ücretsiz plan
oyuncak-3718e CLI bağlantısı doğrulandı. Kurallar emülatörde sahiplik, skor doğrulama, yazma aralığı, özel profil ve silme senaryolarında geçti; aynı kurallar canlı projeye başarıyla uygulandı.

Skorlar istemciden Firestore'a yazılır. Kurallar kimlik/sahiplik ve veri biçimi sınırlarını uygular; skorun oynanarak kazanıldığını kanıtlayan sunucu modeli değildir. Çizimler yerel IndexedDB'de saklanır. Ücretli Functions dağıtımı, Blaze yükseltmesi ve APK işlemi yapılmadı. İsteğe bağlı server endpoint açıklaması bu ayrımı belirtir. [Firebase plan bilgisi](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans).

## Doğrulama durumu
- Lint ve TypeScript geçti.
- 26 birim/regresyon test dosyasının tümü geçti.
- Functions sözdizimi ve modül yükleme geçti.
- npm ağacı geçerli; peer uyuşmazlığı yok.
- Basket At ilk canvas boyutlandırması WebKit taşma regresyonu: RED422px → GREEN; altı profilde kontrol edildi.
- Firestore emülatörü son bağımlılık setiyle de geçti.
- Altı Chromium/WebKit profilinde 238 senaryo tarandı: geniş koşuda234 geçti,2 atlandı,2 başarısızlık çıktı. Basket At ilk canvas boyutu düzeltmesi ve bağımsız test çıktı klasörlerinin ayrılmasından sonra ilgili10 tekrar testinin tümü geçti. Sonuç:236 benzersiz senaryo doğrulandı,2 beklenen atlama.
- Tarayıcı testleri ve canlı yerel Firebase yapılandırmasıyla üretim derlemesi geçti.
- HUD kontrastı gerçek tarayıcıda RED (2.48) → GREEN (en az4.5).
- Açık/koyu renkler ve kalıcı tercih gerçek tarayıcıda doğrulandı. JavaScript yüklenmeden önce dört açılış teması kontrolü geçti.

Önceki Playwright 1.63 doğrulamasında WebKit'in zorunlu çevrimdışı gezinme sınırlaması nedeniyle bir senaryo Windows'ta atlandı. Gerçek cihazda Safari11 doğrulaması yapılmadı. İlk geniş çalıştırma makine kaynakları/PowerShell çıktı yönlendirmesine takıldı. Bu çalışma doğrudan dosya çıktısı ve tek işçi kullandı; başarısız testler başarılı sayılmadı.

## Oyun içi tasarımın tamamlanması
Ana sayfa ve katalogdan sonra kalan eski oyun arayüzleri de Gece Bahçesi'ne taşındı. 20 oyun ortak başlık, kapak, geri dönüş ve oyun bilgisi çerçevesini kullanır. Başlangıç, zorluk/karakter seçimi, skor yüzeyleri, yön tuşları, yeniden oynama ve mola penceresi ortak bileşen stillerini kullanır. Başlat/tekrar ikonları ve ses/duraklat kontrolleri SVG'dir. Seçim butonları aria-pressed ile durumlarını bildirir; yalnızca ikon taşıyan yeniden başlat kontrolünün erişilebilir adı vardır.

Tetris ve 2048 blokları, piyano tuşları ve müzikal hafıza pedleri daha sakin ve ayırt edilebilir renklerle güncellendi. Basket sahnesinin gökyüzü, denizi ve zemini bahçenin paletine uyarlandı. Oyun parçalarının, notaların ve renk bulmacalarının anlamları korunur. Matematikte doğru cevabın rengi ve halkası ortak buton stili tarafından bastırılmaz.

Değişiklikler oyun mekaniği ve Firebase kurallarını değiştirmez. Üretim derlemesinden masaüstü, mobil, oyun içi ve mola görüntüleri kontrol edildi.

Son doğrulama: lint, TypeScript, 26 birim/regresyon test dosyası, Functions kontrolü ve üretim derlemesi geçti. Altı tarayıcı/ekran profilindeki 216 senaryonun 214'ü geçti; mevcut iki beklenen atlama korundu. Son CSS ve erişilebilirlik düzeltmeleri üretim önizlemesinde ayrıca 16 masaüstü/mobil senaryoyla doğrulandı; tamamı geçti.

Bağımsız incelemede 2048 yeniden başlat kontrolünün panel stili nedeniyle düşük kontrast taşıdığı görüldü. Panel seçicisi eylem butonlarını dışlayacak biçimde düzeltildi. Fare üzerine gelmeden okunabilirliği ölçen regresyon testi RED (1.02 kontrast) → GREEN (en az 4.5) olarak doğrulandı.

## Skor ve yılan hataları; davranış testlerinin güçlendirilmesi

Matematikte ardışık doğru cevaplar, Firestore'un aynı rekor için uyguladığı 10 saniyelik yazma aralığına çarpıyordu. Gerçek emülatörde servis üzerinden ikinci hızlı yazmanın reddedildiği doğrulandı. Servis artık kayıt zamanına göre bekleme döndürür; kalıcı kuyruk en yüksek rekoru koruyup zamanlayıcıyla yeniden gönderir. Normal bekleme başarısızlık bildirimi üretmez. Gerçek izin/ağ hataları, yerel skor kaybolmadan yeniden deneme durumunda kalır. Güvenlik kuralları gevşetilmedi.

Yılanın dar ekranlarda kaybolmasının nedeni, sabit oyun alanının önce flex tarafından daraltılıp sonra ikinci kez ölçeklenmesiydi. Alanın doğal boyutu korunur ve görsel ölçek sol üstten uygulanır. Klavye, dokunmatik yön tuşları ve kaydırma aynı yön kuyruğunu kullanır; son bekleyen yöne göre ters dönüş ve yinelenen giriş reddedilir. İki ayrı kaydırma dinleyicisinin aynı hareketi tekrar kuyruğa eklemesi kaldırıldı. Oyunun mevcut kenardan sarma davranışı korunur.

Yeni testler ayrıca şekil eşleştirme seçeneklerinin dekorasyon CSS'iyle gizlendiğini ve çizim tuvali içinde ikinci bir `main` oluştuğunu yakaladı. İşlevsel seçenek görselleri görünür hale getirildi; çizim tuvali adlandırılmış bir `section` kullanır. Testler tuval hazır olduktan sonra tek ana içerik alanı bulunduğunu denetler.

Test derlemesi üretim önizlemesinden ayrıldı. Rota, servis çalışanı ve önbellek eklentileri Vite'ın seçilen çıktı klasörünü kullanır. Temiz özel çıktı klasöründeki gerçek eklentilerle yapılan test, önce yanlış `dist/index.html` erişiminde başarısız oldu ve düzeltmeden sonra geçti.

Yeni kapsam, hata öncesi/sonrası kanıtları ve tekrar çalıştırma komutları [test kalitesi belgesinde](test-quality.md) yer alır. Firestore emülatöründe 23 oyun kimliğinin sahiplik kuralları ve üretim skor servisiyle ilk yazma, düşük skor koruması, hızlı rekorlar, otomatik en yüksek rekor teslimatı, paylaşım kapatma, çevrimdışı kayıt ve gerçek izin hatası sonrası kurtarma geçti. Entegrasyonun kimlik sınırında emülatör test kullanıcısı kullanılır; canlı veritabanına test verisi yazılmaz.

Son kod setinde lint, TypeScript, 27 birim/regresyon dosyası, Functions sözdizimi ve üretim derlemesi geçti. Üretim ve Functions bağımlılık taramalarında açık sayısı sıfırdır; yukarıdaki geliştirme bağımlılığı uyarısı korunur.

Son tarayıcı doğrulaması: geniş 279 senaryoluk koşuda 266 geçti, 11 başarısızlık ve 2 mevcut atlama çıktı. Çizim düzeltmesi ve servis çalışanı/test sunucusu izolasyonundan sonra güncel üretim sürümündeki 63 senaryonun 62'si geçti, yalnızca mevcut Windows WebKit çevrimdışı senaryosu atlandı; başarısız ve flaky sonuç sayısı sıfırdır. İlk 11 başarısız senaryonun tamamının bu son başarılı koşuda bulunduğu raporlar karşılaştırılarak doğrulandı. Dört yeni skor bildirimi kontrolü dahil toplam **281 benzersiz senaryo doğrulandı**, 2 mevcut atlama korunur. Son doğrulamanın kendi sunucusu koşucu tarafından yönetildi; açık önizleme yeniden başlatıldı ve güncel sürüme geçirildi.

## WebKit çevrimdışı CI hatası

Linux CI'da 281 testin ardından Tank Arena'nın çevrimdışı yeniden yüklemesi `WebKit encountered an internal error` ile başarısız oldu. Windows'ta önceki platform atlaması kaldırılınca aynı hata tekrar üretildi. Playwright'ın [42775 numaralı hata kaydı](https://github.com/microsoft/playwright/issues/42775) ve [42894 numaralı düzeltmesi](https://github.com/microsoft/playwright/pull/42894), WebKit çevrimdışı ağ emülasyonundaki regresyonu doğrular.

Playwright ve iki bağlı paketi 1.63.0'dan 1.64.0'a yükseltildi; kilit dosyası güncellendi. Tank Arena ve derin oyun rotası çevrimdışı testlerindeki Windows atlamaları kaldırıldı. Gerçek ağ kapatma ve önbellekten yeniden yükleme doğrulamaları korunur. Hata veren iPhone senaryosu yeni sürümle geçti.

8 Ekim 2026 son doğrulaması: altı tarayıcı/ekran profilinin tek işçili tam koşusunda **282 başarılı, 1 beklenen masaüstü dokunmatik atlaması, 0 başarısız ve 0 flaky**. İlk iki işçili yerel koşudaki dört süre sınırı hatası ve tekrar doğrulaması [test kalitesi belgesinde](test-quality.md) açıklanır. Lint, TypeScript, 27 birim/regresyon test dosyası, Functions sözdizimi, bağımlılık ağacı ve temiz E2E derlemesi geçti. GitHub CI sonucu ayrıca doğrulanmalıdır.

## Oyun davranışlarının ek incelemesi

2048 geri almanın hamle sayacını düzeltmesi, müzikal hafızada çıkışın bekleyen diziyi iptal etmesi, köstebekte fare/dokunma/klavye eyleminin ortak click davranışını kullanması ve kodlamada sıfırlamanın bekleyen hareketi iptal etmesi sağlandı. Bu dört sorun gerçek arayüz testlerinde önce başarısız oldu.

Bağımsız inceleme, köstebeğin durum değişiminde basılı Space'i kaybetmesi ve kodlamada ödül sonrası sıfırlamanın tur geçişini iptal etmesi için ek regresyonlar getirdi. Her köstebek görünümünün kimliği sabit kaldı; kodlama ödülü ve bölüm geçişi tek kez işlenir, geçiş sırasında sıfırlama kilitlenir. React state updater içindeki bölüm/oyun bitişi yan etkileri normal geçiş callback'ine taşındı.

On yeni davranış senaryosu masaüstü, mobil Chromium ve iPhone/WebKit üzerinde çalışır. [20 oyunun kapsam tablosu](gameplay-coverage.md), test edilmiş davranışlarla henüz sınanmayan önemli durumları ayrı gösterir. Testlerin geçmesi bütün oyunların bütün olası durumlarında hatasız olduğu iddiasına dönüştürülmez.

Son yerel doğrulama: altı profilin tam koşusunda **312 geçti, 1 beklenen atlama, 0 başarısız ve 0 flaky**. On yeni senaryonun 30 tarayıcı örneği tam koşuya dahildir. Lint, TypeScript, 27 birim/regresyon test dosyası, Functions sözdizimi ve üretim derlemesi geçti. Üretim önizlemesi yeniden başlatıldı; 4184'te güncel derlemenin sunulduğu doğrulandı.


## Hikâyelerin yenilenmesi

Kütüphane ve okuyucu onaylanan Gece Bahçesi tasarımına geçirildi. 32 metin, 32 çizimli kapak ve 11 sahne manzarası yenilendi; dokuz hikâyede farklı sahneler seçilebilir. Okuyucu seçilen yolu kaydeder, geri dönüşte o yolu izler ve eski kayıtları doğrulayarak taşır. Modern kategori simgeleri, yerel ilerleme, kategori içinde rastgele seçim ve her hikâyede düşünme sorusu eklendi. Klavye odağı ve WebKit tema kontrastı gerçek regresyonlarla düzeltildi. Kapsam ve son doğrulama [test kalitesi belgesindedir](test-quality.md).


9 Ekim 2026: tam yerel tarayıcı koşusu **360 başarılı, 1 beklenen atlama, 0 başarısız ve 0 flaky**; yeni hikâye kapsamının 48 örneği dahildir. Lint, tip kontrolü, 29 birim/regresyon dosyası, Functions kontrolü ve üretim derlemesi geçti. Güncel uygulama önizlemesinde hikâye bölümü ve okuyucu telefon/tablet/masaüstünde incelendi.
