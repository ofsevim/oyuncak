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

Windows WebKit'in zorunlu çevrimdışı gezinme sınırlaması nedeniyle mevcut bir senaryo Windows'ta atlanır. Gerçek cihazda Safari11 doğrulaması yapılmadı. İlk geniş çalıştırma makine kaynakları/PowerShell çıktı yönlendirmesine takıldı. Son çalışma doğrudan dosya çıktısı ve tek işçi kullanır; başarısız testler başarılı sayılmaz.
