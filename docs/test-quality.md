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

Oyun başına doğrulanan davranışlar ve eksik önemli senaryolar [oyun kapsamı tablosunda](gameplay-coverage.md) yer alır.

## Eski skor kayıtlarında takma ad güncelleme

8 Ekim 2026: canlı kuralların yerel kurallarla aynı olduğu doğrulandı. Eski Matematik kayıtlarında `gameId` alanının eksik olması, yalnızca adı değiştiren toplu yazıyı reddediyordu. Gerçek SDK ve Firestore emülatöründeki eski kayıt senaryosu düzeltmeden önce `permission-denied` ile başarısız oldu. Güncelleme artık belge yolundaki oyun kimliğini de ekler; skor, tarih ve kullanıcı kimliği korunur.

`npm run test:integration`, profil kaydını, birden fazla liderlik tablosunun güncellenmesini, eski kayıt dönüşümünü, paylaşım kapalıyken yazılmamasını, çevrimdışı hatayı, gerçek sahiplik ihlalinin reddini ve sonraki başarılı denemeyi doğrular. Bu senaryolar canlı veritabanına test kaydı yazmaz. Güvenlik kuralları gevşetilmedi.

## WebKit çevrimdışı CI regresyonu

Playwright 1.63.0, `context.setOffline(true)` sonrasında servis çalışanı yanıt verse bile WebKit navigasyonunu `internal error` ile reddediyordu. Önceki Windows atlaması Linux CI'ı kapsamıyordu; CI logunda 281 başarılı senaryo yanında bu test başarısız oldu. Aynı hata yerelde atlama kaldırılarak tekrar üretildi.

Playwright 1.64.0'a geçildi; paket ve kilit dosyası birlikte güncellendi. Çevrimdışı testlerdeki platform atlamaları kaldırıldı. Gerçek ağı kapatma, servis çalışanının kontrolü ve Tank Arena iframe'inin önbellekten yeniden yüklenmesi aynı testte korunur. Uygulamanın servis çalışanını değiştiren veya hatayı yakalayıp başarılı sayan bir kestirme kullanılmaz. [Playwright hata kaydı](https://github.com/microsoft/playwright/issues/42775), [resmi düzeltme](https://github.com/microsoft/playwright/pull/42894).

8 Ekim 2026 doğrulaması: iPhone çevrimdışı senaryosu tek başına geçti. İlk iki işçili yerel tam koşuda 278 test geçti, dört senaryo yükleme/kontrol süre sınırlarına takıldı. Bu dört senaryo ve ilgili mobil/iPhone kontrolleri tek işçili 10 senaryoluk koşuda geçti. Ardından aynı kaynaklarla ve mevcut süre sınırlarıyla altı profilin tamamı tek işçiyle yeniden çalıştırıldı: **282 geçti, 1 masaüstü dokunmatik kontrolü atlandı; 0 başarısız, 0 flaky**. Yerel Windows sonucu GitHub Linux CI başarısı olarak sayılmaz; CI iki işçi kullanmayı sürdürür.

Lint, TypeScript, 27 birim/regresyon test dosyası, Functions sözdizimi ve bağımlılık ağacı kontrolü geçti. Üretim ve Functions bağımlılık taramalarında açık bulunmadı; mevcut geliştirme bağımlılığı uyarısı sürer. Tam E2E koşusu temiz test derlemesini de tamamladı.

## Oyun içi butonlar ve yaşam döngüsü

Yeni gerçek arayüz senaryoları düzeltmelerden önce şu hataları yakaladı:

- 2048 geri alma tahtayı/skoru geri getirdiği halde hamle sayacını 1'de bırakıyordu. Sayaç şimdi geri alınan hamleyi de çıkarır; etkisiz hamle puan veya yeni taş üretmez.
- Müzikal hafızada gösterim sırasında çıkış, bekleyen diziyi iptal etmiyordu; menü 1.4 saniye sonra tekrar oyun ekranına dönüyordu. Çıkış zamanlayıcıları temizler ve dizi kimliğini geçersiz kılar.
- Köstebek butonu yalnızca pointer-down dinlediğinden Enter ile etkinleştirme puan vermiyordu. Yerel click davranışı fare, dokunma, Enter ve Space'i aynı eyleme taşır. Her köstebeğin kimliği yükselme/tepe/vuruş boyunca sabittir; vurulan/düşen hedef kilitlenir.
- Kodlamada sıfırlanan çalıştırmanın bekleyen hareketi 400ms sonra karakteri tekrar oynatıyordu. Sıfırlama bekleyen işleri ve geri bildirimi temizler, başlangıç konumunu geri getirir.

Bağımsız inceleme sonrası, köstebek yükselirken basılı Space'in bırakılması ve kodlamada ödül sonrası sıfırlama için ayrı başarısız regresyonlar üretildi. Kodlama ödülü yalnızca bir kez işlenir; bölüm geçişinde sıfırla/yeni bölüm kilitlenir. Sonraki bölüm ve kalan tur sayısı yan etkili bir React state updater içinden değiştirilmez.

On yeni senaryo masaüstü, mobil Chromium ve iPhone/WebKit projelerine dahildir. Ek kapsam; 2048/Tetris molada klavye, müzikal hafızada doğru/yanlış sıra ve replay, köstebekte 80ms debounce sonrasında hedef kilidi ve iki kokarca cezasının sıfır alt sınırı, kodlamada görünür sekiz yasal adımla 17 puan ve sonraki bölümdür. Kodlama testi her adımın görünen hücresini bekler; yalnızca sanal saati ilerletip React render'ının bittiğini varsaymaz. Üretim koduna özel test erişimleri eklenmedi.

Son doğrulama (8 Ekim 2026): son kaynaklardan üretilmiş izole test derlemesiyle altı profil, tek işçi ve mevcut süre sınırlarında **312 geçti, 1 beklenen masaüstü dokunmatik kontrolü atlandı, 0 başarısız, 0 flaky**. On yeni senaryonun üç profildeki 30 örneği bu tam koşuya dahildir. Lint, TypeScript, 27 birim/regresyon dosyası, Functions sözdizimi ve gerçek üretim derlemesi geçti. 4184 önizleme sunucusunun güncel `dist/index.html` dosyasını sunduğu içerik özetiyle doğrulandı. Yerel sonuç yeni bir GitHub CI koşusu olarak sunulmaz.


## Hikâye atölyesi

Onaylanan Gece Bahçesi tasarımı kütüphane ve okuyucuya uygulandı. 32 hikâyenin kimliği korundu; metinler 4–6 bölümlük olay örgüsü, diyalog, sonuç ve birlikte düşünme sorusuyla yeniden yazıldı. Dokuz hikâyede farklı sahnelere giden seçimler bulunur. Kapaklar 32 ayrı yerel SVG motifinden, sahneler 11 manzaradan oluşur; emoji veya uzaktan yüklenen görsel kullanılmaz. Okuma süresi, en uzun tek yolun kelime sayısından hesaplanır; alternatif sahneler birlikte sayılmaz.

Önce başarısız olan regresyonlar: seçim ekranını ok tuşuyla atlama, birleşimden geri dönünce okunmamış alternatif sahneyi açma, kütüphaneye dönünce eski ilerlemeyi gösterme, bozuk sayfa indeksini kabul etme ve okuyucudan çıkınca klavye odağını kaybetme. Kaydedilen yol gerçek geçişlerle doğrulanır; eski sayısal kayıtlar ulaşılabilir bir yola çevrilir. Rastgele seçim etkin kategori içinde kalır.

Altı profilde sekiz gerçek arayüz senaryosu eklenmiştir: seçim/klavye, dal sonrası geri dönüş, yeniden açma ve odak, bitirme/yeniden başlama, kategori/rastgele seçim, bozuk kayıt, eski kayıttan devam ve açık/koyu temada kontrast/dokunma boyutu/taşma. İlk 48 örneğin 47’si geçti; iPhone/WebKit tema değişiminde paragrafın önceki rengi bir süre korudu. Hesaplanmış DOM renkleri ve ekran görüntüsüyle yeniden üretildi; paragrafa doğrudan tema rengi verilince aynı iPhone testi geçti. Teste sabit bekleme veya platform atlaması eklenmedi.

Birim testleri tüm kataloğun sayfa hedeflerini, ulaşılabilirliğini, döngüsüz bitişini, seçim adlarını, kayıt dönüşümünü ve alternatifleri çift saymayan okuma süresini kontrol eder. Bu değişiklik sunucuya hikâye kaydı yazmaz; ilerleme cihazda saklanır. Eski metinler yeniden yazıldığı için eski sayısal kayıt aynı sayfa indeksini sürdürür, eski cümlenin birebir konumu korunmaz.


9 Ekim 2026 son doğrulaması: güncel kaynaklardan temiz izole derleme ile altı profil ve tek işçide **360 geçti, 1 beklenen masaüstü dokunmatik testi atlandı, 0 başarısız, 0 flaky**. Yeni sekiz hikâye senaryosunun 48 tarayıcı örneği tam koşuya dahildir. Koşu 25.5 dakika sürdü; yeniden deneme veya süre sınırı genişletme kullanılmadı. Lint, TypeScript, 29 birim/regresyon test dosyası, Functions sözdizimi ve üretim derlemesi geçti. Gerçek önizlemede 320px telefon, 768px tablet ve 1280px masaüstü yerleşimi görsel olarak incelendi; tarayıcı hata kaydı boştu. 4184 sunucusunun güncel üretim çıktısını sunduğu içerik özetiyle doğrulandı. Bunlar yerel Windows sonuçlarıdır; yeni bir GitHub CI koşusu veya dağıtım yapılmadı.

## Hafıza Oyunu CI tıklama beklemesi

9 Ekim 2026: [CI #94](https://github.com/ofsevim/oyuncak/actions/runs/37845780675) iki işçide 359 başarılı, bir beklenen atlama ve bir iPhone/WebKit hatası verdi. İpucu kapandıktan sonra ilk kartın `click()` çağrısı, Playwright'ın görünürlük/etkinlik/kararlılık beklemesinde 60 saniye takıldı; oyun sonucu kontrolüne ulaşılmadı. Aynı senaryo Windows/WebKit'te 23 tekrarda geçti. Linux'ta benzer sentetik tıklama takılması [Playwright #33057](https://github.com/microsoft/playwright/issues/33057) kaydında da bulunur; bu benzerlik tek başına aynı kök nedenin kanıtı değildir.

İpucu, yanlış çiftin kapanması ve doğru çiftin tamamlanması artık gerçek düğmelerin Enter girdisiyle doğrulanır. Ayrı senaryo masaüstünde fareyle, mobil profillerde dokunmayla kart yüzünün açılmasını ve açık kartın devre dışı kalmasını kontrol eder. İpucundan sonra fare/dokunmayla çift tamamlama bu senaryoların kapsamında değildir. Zorlanmış tıklama, DOM üzerinden olay gönderme, platform atlaması, yeniden deneme veya süre sınırı genişletme eklenmedi; oyun kodu değişmedi.

Değişiklikten sonra bu iki senaryonun masaüstü Chromium, Android Chromium ve iPhone/WebKit profillerinde üçer tekrarı, iki işçide **18/18 geçti**. Lint ve diff kontrolü geçti; lint, Functions sözdizimi, 29 birim dosyası, TypeScript ve üretim derlemesini içeren `npm run check` de geçti. Bunlar yerel Windows sonuçlarıdır. Linux CI hatası yerelde tekrar üretilemedi; yeni GitHub koşusu ve tam tarayıcı paketi bu değişiklikten sonra henüz çalıştırılmadı.
