
interface ColorDef {
  name: string;
  value: string;
  light: string;
}

export const COLORS: ColorDef[] = [
  { name: 'Kırmızı', value: '#FF0000', light: '#FFCDD2' },
  { name: 'Bordo', value: '#880E4F', light: '#F48FB1' },
  { name: 'Turuncu', value: '#FF9800', light: '#FFE0B2' },
  { name: 'Sarı', value: '#FFEB3B', light: '#FFF9C4' },
  { name: 'Açık Yeşil', value: '#8BC34A', light: '#DCEDC8' },
  { name: 'Yeşil', value: '#4CAF50', light: '#C8E6C9' },
  { name: 'Koyu Yeşil', value: '#1B5E20', light: '#A5D6A7' },
  { name: 'Camgöbeği', value: '#00BCD4', light: '#B2EBF2' },
  { name: 'Açık Mavi', value: '#03A9F4', light: '#B3E5FC' },
  { name: 'Mavi', value: '#2196F3', light: '#BBDEFB' },
  { name: 'Lacivert', value: '#1A237E', light: '#9FA8DA' },
  { name: 'Mor', value: '#9C27B0', light: '#E1BEE7' },
  { name: 'Açık Pembe', value: '#FF80AB', light: '#F8BBD0' },
  { name: 'Pembe', value: '#E91E63', light: '#F06292' },
  { name: 'Koyu Pembe', value: '#C2185B', light: '#F48FB1' },
  { name: 'Ten Rengi', value: '#FFCCBC', light: '#FBE9E7' },
  { name: 'Kahverengi', value: '#795548', light: '#D7CCC8' },
  { name: 'Gri', value: '#9E9E9E', light: '#F5F5F5' },
  { name: 'Siyah', value: '#212121', light: '#757575' },
  { name: 'Beyaz', value: '#FAFAFA', light: '#FFFFFF' },
];

export const STICKERS = [
  '🐱', '🐶', '🦄', '🌈', '🌟', '🚀',
  '🍦', '🎨', '🐼', '🐯', '🦋', '🌻',
  '🐸', '🎀', '🌸', '🐝', '🍎', '☀️',
];

export const RAINBOW = ['#EF5350', '#FFA726', '#FFEE58', '#66BB6A', '#42A5F5', '#AB47BC'];

export type BrushId = 'pencil' | 'pastel' | 'crayon' | 'watercolor' | 'marker' | 'glitter';

interface BrushDef {
  id: BrushId;
  name: string;
  icon: string;
  desc: string;
}

export const BRUSHES: BrushDef[] = [
  { id: 'pencil', name: 'Kalem', icon: '✏️', desc: 'İnce, hassas' },
  { id: 'pastel', name: 'Pastel', icon: '🎨', desc: 'Yumuşak, grenli' },
  { id: 'crayon', name: 'Kuruboya', icon: '🖍️', desc: 'Balmumu dokusu' },
  { id: 'watercolor', name: 'Sulu Boya', icon: '💧', desc: 'Saydam, akan' },
  { id: 'marker', name: 'Keçeli', icon: '🖌️', desc: 'Bold, canlı' },
  { id: 'glitter', name: 'Simli', icon: '✨', desc: 'Parıltılı' },
];

/** Her fırçanın stamp noktaları arasındaki piksel mesafesi */
export const SPACING: Record<BrushId, number> = {
  pencil: 1,
  pastel: 1.5,
  crayon: 1.5,
  watercolor: 3,
  marker: 2,
  glitter: 4,
};

/* ═══════════════════════════════════════════
   FIRÇA STAMP FONKSİYONLARI
   ═══════════════════════════════════════════ */

type StampFn = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) => void;

const hexToRgb = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
};

const clamp = (v: number) => Math.max(0, Math.min(255, v));

const stampPencil: StampFn = (ctx, x, y, size, color) => {
  const [r, g, b] = hexToRgb(color);
  const radius = Math.max(size * 0.4, 1);

  ctx.save();
  // Kalem (Grafit): Yumuşak, kağıt dokusuna karışan düşük opaklıklı yapı
  ctx.globalAlpha = 0.15; // Çok düşük opaklık, üst üste binince kararsın

  // Ana yumuşak gövde
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Kağıt pürüzü ve grafit granülleri
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < size * 1.5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius * 1.2;
    const ox = Math.cos(angle) * dist;
    const oy = Math.sin(angle) * dist;

    ctx.fillStyle = `rgb(${r},${g},${b})`;
    const pSize = 0.5 + Math.random() * 1.5;
    ctx.fillRect(x + ox, y + oy, pSize, pSize);
  }
  ctx.restore();
};

const stampPastel: StampFn = (ctx, x, y, size, color) => {
  const [r, g, b] = hexToRgb(color);
  const radius = size * 0.8;

  ctx.save();
  // Pastel: Tebeşirimsi, yoğun pigmentli ve tozlu
  for (let i = 0; i < size * 3; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius;
    const ox = Math.cos(angle) * dist;
    const oy = Math.sin(angle) * dist;

    // Kenarlara doğru tozlanma artar, merkeze doğru pigment daha yoğun
    const isEdge = dist > radius * 0.6;
    ctx.globalAlpha = isEdge ? 0.2 + Math.random() * 0.3 : 0.5 + Math.random() * 0.4;

    // Tebeşir tozu hissi için renk varyasyonları
    const mixChalk = Math.random() > 0.7;
    if (mixChalk) {
      // Açık renkli (tebeşir) toz
      ctx.fillStyle = `rgb(${clamp(r + 40)}, ${clamp(g + 40)}, ${clamp(b + 40)})`;
    } else {
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    }

    const pSize = 1.5 + Math.random() * 2.5;
    ctx.fillRect(x + ox, y + oy, pSize, pSize);
  }
  ctx.restore();
};

const stampCrayon: StampFn = (ctx, x, y, size, color) => {
  const [r, g, b] = hexToRgb(color);
  const radius = size * 0.8;

  ctx.save();
  // Kuruboya (Wax Crayon): Mumsu doku, kağıdın girintilerini atlar, serttir
  for (let i = 0; i < size * 4; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius;
    const ox = Math.cos(angle) * dist;
    const oy = Math.sin(angle) * dist;

    // Rastgele boşluklar bırakarak kağıt dokusunu simüle et
    if (Math.random() > 0.85) continue;

    // Daha sert mumsu pigmentler
    ctx.globalAlpha = 0.4 + Math.random() * 0.5;
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

    const pSize = 1 + Math.random() * 2;
    ctx.fillRect(x + ox, y + oy, pSize, pSize);
  }

  // Sürtünmeden kaynaklı sert yönlü mumsu çizgiler
  if (Math.random() > 0.5) {
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    const px1 = x + (Math.random() - 0.5) * radius * 1.5;
    const py1 = y + (Math.random() - 0.5) * radius * 1.5;
    const px2 = x + (Math.random() - 0.5) * radius * 1.5;
    const py2 = y + (Math.random() - 0.5) * radius * 1.5;
    ctx.moveTo(px1, py1);
    ctx.lineTo(px2, py2);
    ctx.stroke();
  }
  ctx.restore();
};

const stampWatercolor: StampFn = (ctx, x, y, size, color) => {
  const [r, g, b] = hexToRgb(color);
  const spread = size * 1.9;

  ctx.save();
  // Sulu boyanın kağıt üzerindeki gerçekçi renk karışımı
  ctx.globalCompositeOperation = 'multiply';

  const grad = ctx.createRadialGradient(x, y, 0, x, y, spread);
  // Merkeze doğru şeffaf (su birikintisi)
  grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.05)`);
  // Gövde
  grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.08)`);
  // 'Wet Edge' (Kenarda boya birikmesi - karakteristik sulu boya lekesi)
  grad.addColorStop(0.85, `rgba(${r}, ${g}, ${b}, 0.22)`);
  grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

  ctx.fillStyle = grad;
  ctx.beginPath();

  // Suyun kağıt dokusu üzerindeki düzensiz dağılımını taklit etmek için rastgele organik dalgalanmalar
  const numPoints = 14;
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const radiusNoise = 1 + (Math.random() * 0.28 - 0.14);
    const px = x + Math.cos(angle) * spread * radiusNoise;
    const py = y + Math.sin(angle) * spread * radiusNoise;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const stampMarker: StampFn = (ctx, x, y, size, color) => {
  const [r, g, b] = hexToRgb(color);

  ctx.save();
  // Alkol bazlı tasarım marker kalemi (Copic/Keçeli) dokusu
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 6); // Kesik uç eğimi

  const w = size * 2.2;
  const h = size * 0.7;

  // Kesik uçlu keçeli kalem gövdesi
  ctx.fillRect(-w / 2, -h / 2, w, h);

  // Mürekkebin kağıda emilmesini (bleeding) taklit eden ikinci yumuşak katman
  ctx.globalAlpha = 0.06;
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.55, h * 0.68, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

const stampGlitter: StampFn = (ctx, x, y, size, color) => {
  const [r, g, b] = hexToRgb(color);
  const spread = size * 1.8;

  ctx.save();
  // 1. Simli boyanın altındaki renkli jel/boya bazı
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.beginPath();
  ctx.arc(x, y, spread * 0.75, 0, Math.PI * 2);
  ctx.fill();

  // 2. Yoğun ve parıldayan metalik sim pulları
  const numFlakes = 18;
  for (let i = 0; i < numFlakes; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.sqrt(Math.random()) * spread * 1.3;
    const fx = x + Math.cos(angle) * dist;
    const fy = y + Math.sin(angle) * dist;

    ctx.globalAlpha = 0.75 + Math.random() * 0.25;

    let flakeColor: string;
    const randType = Math.random();
    if (randType < 0.35) {
      flakeColor = `hsl(${Math.random() > 0.5 ? 35 : 0}, 100%, 70%)`; // Altın sarısı sim
    } else if (randType < 0.65) {
      flakeColor = `hsl(${Math.random() * 360}, 100%, 75%)`; // Holografik
    } else {
      flakeColor = `hsl(190, 80%, ${85 + Math.random() * 15}%)`; // Gümüş / Elmas
    }

    const flakeSize = 1.0 + Math.random() * 2.2;
    ctx.fillStyle = flakeColor;
    ctx.beginPath();
    ctx.arc(fx, fy, flakeSize, 0, Math.PI * 2);
    ctx.fill();

    if (Math.random() > 0.4) {
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(fx - 0.4, fy - 0.4, flakeSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Sihirli Parlama Yıldızları
  const numStars = Math.random() > 0.5 ? 2 : 1;
  for (let s = 0; s < numStars; s++) {
    if (Math.random() > 0.3) {
      const sx = x + (Math.random() - 0.5) * spread * 1.4;
      const sy = y + (Math.random() - 0.5) * spread * 1.4;
      const starSize = 4 + Math.random() * 6;

      const haloGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, starSize * 1.8);
      haloGrad.addColorStop(0, `rgba(255, 255, 255, 0.45)`);
      haloGrad.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.25)`);
      haloGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(sx, sy, starSize * 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#ffffff';
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(Math.random() * Math.PI);

      ctx.beginPath();
      ctx.moveTo(0, -starSize);
      ctx.quadraticCurveTo(0, 0, starSize, 0);
      ctx.quadraticCurveTo(0, 0, 0, starSize);
      ctx.quadraticCurveTo(0, 0, -starSize, 0);
      ctx.quadraticCurveTo(0, 0, 0, -starSize);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
};

export const STAMP_FN: Record<BrushId, StampFn> = {
  pencil: stampPencil,
  pastel: stampPastel,
  crayon: stampCrayon,
  watercolor: stampWatercolor,
  marker: stampMarker,
  glitter: stampGlitter,
};
