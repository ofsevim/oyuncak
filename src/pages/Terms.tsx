import { Link } from 'react-router-dom';

export default function Terms() {
  return <main className="mx-auto max-w-3xl px-5 py-10 space-y-6 leading-relaxed">
    <Link to="/parents" className="text-primary underline">← Ebeveyn Alanı</Link>
    <h1 className="text-3xl font-black">Kullanım Bilgileri</h1>
    <p>Oyuncak ücretsiz oyun, çizim ve hikâye etkinlikleri sunar. Yaş etiketleri ve süreler öneridir; çocuğunuz için uygun etkinliği birlikte seçin. İçerikler bir eğitim değerlendirmesi veya gelişim testi değildir.</p>
    <p>Global tablolarda kişisel bilgi, hakaret veya başkalarını taklit eden adlar kullanmayın. Skorları değiştirmek ve hizmeti otomatik isteklerle kötüye kullanmak diğer oyuncuların deneyimini bozar.</p>
    <p>Çevrimdışı kullanım için ilk yüklemenin internet bağlantısıyla tamamlanması gerekir. Global skorlar internet gerektirir. Cihazdaki çizim ve ilerleme kayıtlarını düzenli olarak yedeklemeniz önerilir.</p>
    <p>Veri kullanımı ve silme seçenekleri <Link to="/privacy" className="text-primary underline">Gizlilik ve Veri Kullanımı</Link> sayfasında açıklanır.</p>
    <p>Sorun bildirmek veya geliştiriciye ulaşmak için <a href="https://omersevim.com.tr" target="_blank" rel="noopener noreferrer" className="text-primary underline">Osoft</a> sitesini ziyaret edebilirsiniz.</p>
  </main>;
}
