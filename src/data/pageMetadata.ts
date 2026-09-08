import { GAME_CATALOG } from './gameCatalog';

const STATIC_PAGES: Record<string, { title: string; description: string }> = {
  '/': { title: 'Oyuncak - Oyun Dünyası', description: '21 ücretsiz oyun, çizim atölyesi ve interaktif hikâyeler. Reklamsız oyun ve yaratıcılık alanı.' },
  '/games': { title: 'Ücretsiz Çocuk Oyunları | Oyuncak', description: 'Yaşa ve beceriye göre oyun seç; hafıza, matematik, müzik ve refleks oyunlarını keşfet.' },
  '/draw': { title: 'Çizim Atölyesi | Oyuncak', description: 'Serbest çizim yap, sticker ekle ve resimlerini kendi cihazındaki galeride sakla.' },
  '/story': { title: 'İnteraktif Hikâyeler | Oyuncak', description: 'Çocuklar için interaktif hikâyeleri keşfet ve okumaya kaldığın sayfadan devam et.' },
  '/parents': { title: 'Ebeveyn Alanı | Oyuncak', description: 'Skor paylaşımı, mola hatırlatıcısı, animasyon tercihleri ve veri silme seçenekleri.' },
  '/privacy': { title: 'Gizlilik ve Veri Kullanımı | Oyuncak', description: 'Oyuncak cihazda ve bulutta hangi verileri saklar? Veri kontrol ve silme seçeneklerini öğren.' },
  '/terms': { title: 'Kullanım Bilgileri | Oyuncak', description: 'Oyuncak oyunları, yerel kayıtlar ve global skorların kullanım bilgileri.' },
};

export const PAGE_ROUTES = [...Object.keys(STATIC_PAGES), ...GAME_CATALOG.map((game) => `/games/${game.id}`)];
export function getPageMetadata(pathname: string) {
  const path = pathname.replace(/\/$/, '') || '/';
  if (STATIC_PAGES[path]) return { ...STATIC_PAGES[path], found: true };
  const game = GAME_CATALOG.find((entry) => `/games/${entry.id}` === path);
  return game ? { title: `${game.title} | Oyuncak`, description: `${game.description} ${game.skill}. ${game.minAge}+ yaş için önerilir. Ücretsiz ve reklamsız oyna.`, found: true }
    : { title: 'Sayfa Bulunamadı | Oyuncak', description: 'Aradığın sayfa bulunamadı. Oyuncak oyunlarını keşfedebilirsin.', found: false };
}
