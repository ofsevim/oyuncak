# Oyun davranışı kapsamı

20 oyunun masaüstü/mobil açılışı, oyun yüzeyine geçişi ve görünür kontrollerin içerik/adları test edilir. Altı ekran profilinde sayfa yerleşimleri denetlenir. Bu kontroller her oyun kuralının doğru olduğunu tek başına kanıtlamaz. Aşağıdaki tablo, oynama sırasında ayrıca sınanan davranışları ve henüz kapsam dışındaki önemli durumları ayırır.

| Oyun | Mevcut davranış doğrulaması | Genişletilecek önemli durumlar |
| --- | --- | --- |
| Balon | Sayaç, mola/devam, süre bitişi, yeniden oynama; çizim regresyonu | Özel balonların puanları, hızlı çoklu dokunma |
| Basketbol | Atış yörüngesi birim testleri; sahanın açılması | Gerçek atışla isabet/kaçırma, seri atış ve tur bitişi |
| Tank Arena | Gerçek iframe, çevrimdışı kurulum/yükleme, döndürme sonrası kontroller; skor kimliği | Mermi/duvar/düşman çarpışmaları, üs ve can kaybı |
| Köstebek | Enter/Space, yükselirken basılı Space, fare/dokunma ile puan, kokarca cezasında sıfır alt sınırı | Kombo eşikleri, çoklu köstebek, tam tur ve yeniden oynama |
| Koşucu | HUD çakışması, mola/devam; zamanlama ve çizim birim testleri | Engel çarpışması, güçlendirme ve oyun bitişi |
| Tetris | Parça tutma, tekrar tutma sınırı, sert düşüş puanı, molada kısayollar; mantık birim testleri | Gerçek arayüzde satır temizleme, üst sınır/oyun bitişi |
| Yılan | Üç tam kenar geçişinde görünürlük, iki hızlı dönüş; yön kuyruğu/çarpışma birim testleri | Yem/güçlendirme, engelli mod ve yeniden oynama |
| Farklı olan | Açılış ve oyun seçeneklerinin görünürlüğü | Yanlış/doğru seçim, zamanlı tur, tamamlanma |
| Şekil eşleştirme | Seçenek görselleri görünür, doğru siluetin seçimi puan verir | Yanlış seçim, zamanlı tur, bütün bölümler |
| Müzikal hafıza | Gösterimde giriş kilidi, doğru sıra, yanlış nota, skor/replay, gösterim sırasında çıkış | Uzun diziler, ses kapatma ve bölümden ayrılma |
| Kart hafızası | İpucu, yanlış çiftin kapanması, doğru çift/hamle ve eşleşen kartların kilidi | Bütün çiftlerin bitirilmesi, boyut değiştirme, yeniden oynama |
| 2048 | Etkisiz hamle, birleşme puanı, geri alma ve hamle sayacı, molada klavye | 2048'e ulaşma/devam, dolu tahta, geri alma geçmişi sınırı |
| Piyano | Tek basışta tek kayıt notası; melodi birim testleri | Klavye/dokunma birlikteliği, kayıt oynatma ve mola/ses |
| Sayma | Doğru cevaba tek ödül ve cevap kilidi | Yanlış cevap, sayılan nesneler, zorluklar ve tur bitişi |
| Matematik | Doğru/yanlış cevap, tek ödül, yerel rekor; gerçek Firestore kurallarıyla kalıcı skor kuyruğu | İşlem/zorluk çeşitleri ve bütün tur |
| Kodlama | Görünür 5×5 tahtada çalıştırma/sıfırlama, bekleyen hareketin iptali; sekiz yasal adımla hedef, tek ödül ve sonraki bölüm | Engel/sınır, komut sınırı ve farklı bölüm üretimleri |
| Uzay oyunu | Tuvalin ve oyun kontrollerinin açılması | Ateş/düşman isabeti, can kaybı ve yeniden oynama |
| Dört taş | Oyuncu/bilgisayar sırası, kazanma ve yeniden oynama; sonuç birim testleri | Dolu sütun, beraberlik ve diğer zorluklar |
| Kelime bulma | Görünür kelimenin seçimi ve tekrar ödülün engellenmesi | Yanlış/çapraz seçim, bütün kelimeler, tekrar üretim |
| Renk sıralama | Uygun taşıma, geri alma, sıfırlama | Yasak taşıma, tamamlanma ve yeni bulmaca |

Son çalıştırmanın sayıları ve hata öncesi/sonrası kanıtları [test kalitesi belgesinde](test-quality.md) tutulur. Öncelikli sonraki kapsam; çarpışma/can kaybı içeren oyunlar, bulmacaların tamamlanması ve yeniden başlatmada eski zamanlayıcıların iptalidir. Oyun koduna test için özel durum yükleme API'leri eklenmez; kullanıcı kontrolleri, görünen tahta ve gerçek üretim mantığı kullanılır.
