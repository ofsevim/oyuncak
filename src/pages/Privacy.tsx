import { Link } from 'react-router-dom';

export default function Privacy() {
  return <main className="mx-auto max-w-3xl px-5 py-10 space-y-6 leading-relaxed">
    <Link to="/parents" className="text-primary underline">← Ebeveyn Alanı</Link>
    <h1 className="text-3xl font-black">Gizlilik ve Veri Kullanımı</h1>
    <p>Oyuncak'ta reklam ve uygulama içi satın alma bulunmaz. Oyun oynamak için ad, e-posta veya telefon vermeniz gerekmez. Takma ad alanına kişisel bilgi yazmayın.</p>
    <h2 className="text-xl font-bold">Cihazda saklananlar</h2>
    <p>Çizimler ve önizlemeleri IndexedDB'de; yerel rekorlar, takma ad, favoriler, son oyunlar, hikâye ilerlemesi, tema, ses ve ebeveyn tercihleri tarayıcı depolamasında saklanır. Çizimler sunucuya yüklenmez. Çevrimdışı kullanım için uygulama dosyaları önbelleğe alınır. Tarayıcı veya uygulama verilerini temizlemek yerel kayıtları silebilir.</p>
    <h2 className="text-xl font-bold">Global skorlar</h2>
    <p>Global skor paylaşımı varsayılan olarak açıktır ve Ebeveyn Alanı'ndan kapatılabilir. Yeni rekor gönderildiğinde Firebase anonim bir oturum oluşturabilir. Oturum kimliği, oyun kimliği, takma ad, rekor ve kayıt zamanı Firestore'da tutulur. Skor belgeleri herkese açık okunabilir; takma adınız ve rekorunuz liderlik tablosunda görünür. Takma ad kurtarma için kullanılan profil belgesi yalnızca ilgili oturuma açıktır.</p>
    <h2 className="text-xl font-bold">Diğer hizmetler</h2>
    <p>Firebase kimlik doğrulama ve skor saklama için, Google Fonts yazı tiplerini yüklemek için kullanılır. Bu hizmetlere yapılan bağlantılar IP adresi gibi standart bağlantı bilgilerini hizmet sağlayıcıya iletir. Hata izleme hizmeti etkinleştirilmişse teknik hata bilgileri bu hizmete iletilebilir. Uygulama kaynaklarında reklam veya analitik izleme SDK'sı çalıştırılmaz.</p>
    <h2 className="text-xl font-bold">Silme ve kontrol</h2>
    <p>Ebeveyn Alanı'nda skor paylaşımını kapatabilir, mevcut anonim oturumun global skorlarını silebilir veya cihaz kayıtlarını temizleyebilirsiniz. Bunlar ayrı işlemlerdir. Global silme internet bağlantısı gerektirir. Tarayıcı kimliği kaybolmuş eski anonim kayıtlar mevcut oturumdan silinemez. Çizimlerinizi silmeden önce galeriden indirin.</p>
    <p>Skorlar siz silene kadar tutulur; bu uygulamada otomatik süreli silme bulunmaz. Skor paylaşımını kapatmak önceden gönderilmiş kayıtları kaldırmaz.</p>
    <p>Geliştirici bilgileri ve iletişim: <a className="text-primary underline" href="https://omersevim.com.tr" target="_blank" rel="noopener noreferrer">Osoft</a>.</p>
  </main>;
}
