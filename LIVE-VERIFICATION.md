# Canlı ortam doğrulaması

Tarih: 17 Eylül 2026 (Europe/Istanbul). Site: https://adenerva.netlify.app/

Sonuç: Kontrol edilen canlı akışlar tamamlandı. İlk tarayıcı skor gönderiminde geçici anonim giriş hatası görüldü; sonraki yeniden deneme başarılı oldu. Sürekli bir servis kesintisi saptanmadı. Bu sonuç bütün oyunların bütün cihazlarda hatasız olduğu garantisi değildir.

## HTTP ve dağıtım

- 27 rota (ana sayfalar ve katalogdaki 20 oyun) HTTP 200, HTML içerik, rotaya özgü başlık ve doğru canlı canonical adresi döndürdü.
- 10 temel dosya HTTP 200 ve uygun içerik türü döndürdü: ana JavaScript/CSS, React, legacy dosyaları, ikon, manifest, service worker, sitemap ve robots.txt.
- Ana sayfa Cache-Control: no-cache döndürdü.
- Makine tarafından okunabilen sonuçlar: [live-verification.json](live-verification.json).

## Canlı tarayıcı akışları

- Ana sayfadan oyun kataloğuna ve Matematik oyununa geçildi.
- Matematik başlatıldı; duraklatma/devam çalıştı. Doğru cevap 16 puan üretti.
- İlk skor gönderiminde “Skor sunucuya gönderilemedi” bildirimi ve anonim giriş uyarısı görüldü. Yenileme/yeniden deneme sonrasında 16 puan global tabloda “sen” etiketiyle göründü. İlk hatanın ayrıntılı Firebase kodu tarayıcı kayıtlarında görünmediğinden kök neden kesinleştirilmedi.
- Ebeveyn ekranından yalnızca bu test oturumunun bulut skorları silindi. Global tabloda 16 puanlık test kaydının kaldırıldığı ayrıca doğrulandı.
- Çizim kaydedildi; sayfa yenilendikten sonra galeride aynı kayıt görüntülendi.
- Hikâye kitaplığı açıldı, bir hikâye seçildi ve ikinci sayfaya geçildi.
- Tank Arena iframe'i ve oyun ekranı yüklendi; başlatma düğmesi denendi.
- 390 px görünümde çizim, ebeveyn, Matematik ve hikâye ekranlarında yatay taşma ölçülmedi. Tank Arena 844 px yatay görünümde de yatay taşma göstermedi. Bu kontroller masaüstü tarayıcısının görünüm boyutunu değiştirerek yapıldı; gerçek telefon/dokunmatik cihaz testi değildir.

## Gerçek Firebase API ve güvenlik kuralı kontrolleri

Sitede yayımlanan herkese açık Firebase yapılandırması kullanıldı. Kimlik bilgileri/tokenlar rapora yazılmadı.

- Anonim giriş: HTTP 200.
- Geçici test kullanıcısının kendi skorunu yazması ve okuması: HTTP 200; okunan değer doğrulandı.
- Negatif skor yazımı: HTTP 403 ile reddedildi.
- Kullanıcının kendi özel profilini yazması ve okuması: HTTP 200.
- Oturum açmadan özel profili okuma: HTTP 403 ile reddedildi.
- Geçici skor ve profil silme: HTTP 200; skorun artık bulunmadığı HTTP 404 ile doğrulandı.
- Doğrudan API kontrollerinde oluşturulan iki geçici anonim hesap da temizlendi.

## Kapsam sınırları

- 20 oyun rotasının HTTP yanıtı kontrol edildi; bütün oyunlar baştan sona oynanmadı.
- Canlı PWA'nın zorlanmış çevrimdışı yeniden yüklemesi, gerçek Safari/iPhone, uzun süreli oyun, yük testi ve bütün güvenlik kuralları kombinasyonları bu kontrolün kapsamında değildi.
- İlk geçici anonim giriş hatası tekrar sıklığı açısından ölçülmedi. Yeniden deneme akışı bu olayda skoru başarıyla gönderdi.
- Uygulama kaynak kodu veya canlı dağıtım ayarları değiştirilmedi.
