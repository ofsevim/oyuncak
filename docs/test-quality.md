# Davranış testleri ve hata regresyonları

7 Ekim 2026 — testler yalnızca sayfanın açıldığını değil, oyuncunun gördüğü sonucu kontrol eder.

## Katmanlar

| Katman | Doğrulanan davranış |
| --- | --- |
| Birim | Yılanın dört kenarda sarılması, gerçek duvar ve gövde çarpışmaları, büyüme, boşalan kuyruğa hareket, sıralı yön girdileri ve ters dönüşlerin reddi; mevcut oyun ve depolama regresyonları |
| Firestore kuralları | Gerçek yerel emülatörde 23 skor kimliği için sahip yazması/silmesi ve yabancı yazmanın reddi; veri biçimi, yazma aralığı, özel profil ve silme sınırları |
| Skor entegrasyonu | Üretimdeki skor servisi, kalıcı kuyruk ve gerçek Firestore SDK'sı birlikte çalışır. İlk yazma, düşük skor koruması, hızlı rekorlar, zamanlayıcının en yüksek bekleyen skoru otomatik göndermesi, çevrimdışı kayıt ve izin hatasından sonra kurtarma denetlenir. Kimlik sınırında emülatörün test kullanıcısı kullanılır. |
| Oyun davranışı | Matematikte doğru/yanlış cevap ve yerel rekor; saymada tek ödül; hafızada yanlış çiftin kapanması/doğru çift; dört taşta sıra, kazanma ve yeniden oynama; renk sıralamada taşıma/geri alma/sıfırlama; görünür şekil seçenekleri; kelime bulma/tekrar seçme; tek piyano notası; Tetris tutma ve sert düşüş |
| Tarayıcı / ekran | 20 oyunun gerçek oyun yüzeyine geçişi, görünür kontrollerin adları, altı ekran/tarayıcı profilinde yerleşim; yılanın üç tam yatay tur boyunca her parçasının en az %95 görünmesi; klavye ve dokunmatik tuşlarda iki hızlı dönüş |
| Bildirim | Normal sunucu yazma aralığı beklenirken yanlış hata gösterilmemesi; gerçek başarısız denemenin bildirimi ve kuyruğun korunması |
| Derleme | Vite eklentilerinin seçilen çıktı klasörünü kullanması; rota metadatası, servis çalışanı sürümü ve önbellek manifestinin temiz bir test klasörüne yazılması |

## Tekrar çalıştırma

- `npm test`: birim ve regresyon dosyaları.
- `npm run test:integration`: `demo-oyuncak` yerel Firestore emülatörü, güvenlik kuralları ve gerçek skor servisi.
- `npm run test:e2e`: izole test derlemesi ve altı Chromium/WebKit profili.
- `npm run check`: lint, Functions sözdizimi, birim testler, TypeScript ve üretim derlemesi.

E2E derlemesi `.cache/e2e-dist` kullanır. Açık üretim önizlemesinin `dist` klasörünü veya gerçek Firebase yapılandırmasını değiştirmez. Firebase entegrasyon senaryoları canlı veritabanına yazmaz. Tarayıcı testleri canlı Firebase ağ isteklerini engeller; sunucu davranışı emülatörde ayrıca sınanır.

Yerleşim ve giriş testlerinde servis çalışanı kurulumu kapalıdır; her yeni bağlamda arka planda tüm oyunların indirilmesi bu testlerin bir parçası değildir. Tank Arena'nın çevrimdışı kurulum senaryosu servis çalışanını açık tutarak gerçek önbellek, yönlendirme ve ağsız yeniden yüklemeyi ayrıca denetler. Test koşucusu kendi statik sunucusunun yaşam döngüsünü yönetir.

## Hata yakalama kanıtı

- Hızlı ikinci matematik rekoru gerçek kurallarla `permission-denied` verdi. Yazma aralığını bekleyen kuyruk düzeltmesinden sonra otomatik gönderim geçti; testte süre geriye alınmadı ve teslimat elle zorlanmadı.
- 320px ekranda yılan parçasının görünürlüğü %18'e düştü. Sabit alanın flex küçülmesi kaldırılınca üç tam kenar geçişi testi geçti.
- Hızlı yukarı/sol dokunmaları iki yukarı hareketi üretti. Ortak yön kuyruğu son bekleyen yönü dikkate alınca beklenen iki dönüş gerçekleşti.
- Şekil eşleştirme seçeneklerinin görselleri dekorasyon seçicisiyle gizleniyordu. Görünür seçenek testi düzeltmeden önce başarısız oldu.
- Temiz, özel çıktı klasöründe Vite eklentileri yanlışlıkla `dist/index.html` arıyordu. Gerçek eklentilerle çalışan regresyon testi düzeltmeden önce başarısız oldu.
- Çizim tuvali yüklendiğinde iki iç içe `main` oluşuyordu. Yerleşim testi tuvalin hazır olmasını ve tek ana içerik alanını kontrol eder.

## Sınırlar

Bu kapsam her oyunun bütün olası durumlarını tüketmez. Kaynak/varlık tutarlılığı testleri davranış testlerinin yerine kullanılmaz. Masaüstündeki dokunmatik kontrol denemesi açıkça atlanır; atlanan senaryolar başarılı sayılmaz. Gerçek cihazda Safari 11 ve APK bu çalışmanın dışında tutulmuştur.

## WebKit çevrimdışı CI regresyonu

Playwright 1.63.0, `context.setOffline(true)` sonrasında servis çalışanı yanıt verse bile WebKit navigasyonunu `internal error` ile reddediyordu. Önceki Windows atlaması Linux CI'ı kapsamıyordu; CI logunda 281 başarılı senaryo yanında bu test başarısız oldu. Aynı hata yerelde atlama kaldırılarak tekrar üretildi.

Playwright 1.64.0'a geçildi; paket ve kilit dosyası birlikte güncellendi. Çevrimdışı testlerdeki platform atlamaları kaldırıldı. Gerçek ağı kapatma, servis çalışanının kontrolü ve Tank Arena iframe'inin önbellekten yeniden yüklenmesi aynı testte korunur. Uygulamanın servis çalışanını değiştiren veya hatayı yakalayıp başarılı sayan bir kestirme kullanılmaz. [Playwright hata kaydı](https://github.com/microsoft/playwright/issues/42775), [resmi düzeltme](https://github.com/microsoft/playwright/pull/42894).

8 Ekim 2026 doğrulaması: iPhone çevrimdışı senaryosu tek başına geçti. İlk iki işçili yerel tam koşuda 278 test geçti, dört senaryo yükleme/kontrol süre sınırlarına takıldı. Bu dört senaryo ve ilgili mobil/iPhone kontrolleri tek işçili 10 senaryoluk koşuda geçti. Ardından aynı kaynaklarla ve mevcut süre sınırlarıyla altı profilin tamamı tek işçiyle yeniden çalıştırıldı: **282 geçti, 1 masaüstü dokunmatik kontrolü atlandı; 0 başarısız, 0 flaky**. Yerel Windows sonucu GitHub Linux CI başarısı olarak sayılmaz; CI iki işçi kullanmayı sürdürür.

Lint, TypeScript, 27 birim/regresyon test dosyası, Functions sözdizimi ve bağımlılık ağacı kontrolü geçti. Üretim ve Functions bağımlılık taramalarında açık bulunmadı; mevcut geliştirme bağımlılığı uyarısı sürer. Tam E2E koşusu temiz test derlemesini de tamamladı.
