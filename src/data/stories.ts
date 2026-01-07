/**
 * Demo hikaye verileri.
 * - Tamamen client-side (DB yok).
 * - Kısa sayfalar: çocuklar için okunabilir.
 * - Bazı sayfalarda seçim (branch) desteği var.
 */

export type StoryChoice = {
  /** Buton üzerinde görünen metin */
  label: string;
  /** Seçim sonrası gidilecek sayfa index'i (0-based) */
  nextPageIndex: number;
};

export type StoryPage = {
  /** Sayfadaki büyük başlık */
  title: string;
  /** Sayfadaki hikaye metni */
  text: string;
  /** Basit illüstrasyon: emoji */
  illustration: string;
  /** Opsiyonel seçimler (varsa Next/Prev yerine seçim gösterilir) */
  choices?: StoryChoice[];
};

export type Story = {
  id: string;
  title: string;
  tagline: string;
  coverEmoji: string;
  /** Tailwind gradient sınıfı */
  coverGradient: string;
  /** Okuma süresi etiketi */
  durationLabel: string;
  pages: StoryPage[];
};

export const STORIES: Story[] = [
  {
    id: "minik-kasif",
    title: "Minik Kaşif ve Harita",
    tagline: "Bir harita, üç yol, kocaman bir merak.",
    coverEmoji: "🗺️",
    coverGradient: "from-sky-500/20 via-indigo-500/10 to-purple-500/20",
    durationLabel: "6-8 dk",
    pages: [
      {
        title: "Küçük Bir Sırt Çantası",
        text: "Mina bugün ilk kez kendi başına keşfe çıkacaktı. Çantasına su, küçük bir kurabiye ve en sevdiği büyüteci koydu.",
        illustration: "🎒",
      },
      {
        title: "Eski Bir Harita",
        text: "Masanın üstünde kıvrılmış bir harita buldu. Haritanın köşesinde bir not vardı: “Merak eden bulur.”",
        illustration: "🧭",
      },
      {
        title: "Üç Yol",
        text: "Harita üç yola ayrılıyordu: Orman, Sahil ve Tepe. Mina “Hangisi bana daha iyi gelir?” diye düşündü.",
        illustration: "🛤️",
        choices: [
          { label: "Ormana git 🌲", nextPageIndex: 3 },
          { label: "Sahile git 🌊", nextPageIndex: 4 },
          { label: "Tepeye tırman ⛰️", nextPageIndex: 5 },
        ],
      },
      {
        title: "Ormanın Sesi",
        text: "Ormanda kuş sesleri ve yaprak hışırtıları vardı. Mina yavaş yürüdü, dinledi ve kimseyi ürkütmemeye dikkat etti.",
        illustration: "🌲",
      },
      {
        title: "Sahilin Işıltısı",
        text: "Sahilde minik deniz kabukları parlıyordu. Mina kabukları toplamadı; sadece bakıp fotoğrafını zihnine çekti.",
        illustration: "🌊",
      },
      {
        title: "Tepenin Manzarası",
        text: "Tepeye çıkınca her şey küçücük görünüyordu. “Bazen en iyi fikirler yukarıdan bakınca gelir,” dedi Mina.",
        illustration: "⛰️",
      },
      {
        title: "Haritanın Sırrı",
        text: "Haritanın sonunda bir hazine yoktu: Mina’nın kendi cesareti ve dikkati vardı. Bu, en değerli keşifti.",
        illustration: "✨",
      },
      {
        title: "Mutlu Son",
        text: "Mina eve döndü, çantasını yerine koydu ve yeni bir sayfa açtı: “Yarın başka bir macera.”",
        illustration: "🏡",
      },
    ],
  },
  {
    id: "renkli-sehir",
    title: "Renkli Şehirde Bir Gün",
    tagline: "Renkler kaybolunca, küçük bir fikir dünyayı değiştirir.",
    coverEmoji: "🏙️",
    coverGradient: "from-amber-500/20 via-rose-500/10 to-fuchsia-500/20",
    durationLabel: "7-9 dk",
    pages: [
      { title: "Solmuş Sabah", text: "Şehir bugün griydi. Duvarlar, dükkanlar, hatta balonlar… Hepsi sanki rengini unutmuştu.", illustration: "🌫️" },
      { title: "Küçük Bir Fırça", text: "Ece cebinden minicik bir fırça çıkardı. “Bir yerden başlamalıyım,” dedi.", illustration: "🖌️" },
      { title: "İlk Nokta", text: "Kaldırım taşına küçük bir sarı nokta kondurdu. Güneş gibi parladı.", illustration: "🟡" },
      { title: "Renk Bulaşıcıdır", text: "Sarı noktanın yanına mavi eklendi. Sonra pembe… Renkler birbirini çağırdı.", illustration: "🟦" },
      { title: "Komşular Katılır", text: "Bir komşu çiçek çizdi. Bir diğeri kuş yaptı. Şehir birlikte güzelleşti.", illustration: "🌸" },
      { title: "Büyük Duvar", text: "Sonunda kocaman duvar boştu. Ece “Birlikte yapalım!” deyince herkes sıraya girdi.", illustration: "🧱" },
      { title: "Yeni Şehir", text: "Duvar bir masala döndü. Renkler geri geldi, çünkü paylaşılmıştı.", illustration: "🌈" },
      { title: "Mutlu Son", text: "Ece evine dönerken şunu düşündü: “Bir renk bile, bir şehri değiştirebilir.”", illustration: "💡" },
    ],
  },
  {
    id: "yildiz-robot",
    title: "Yıldız Robot Riko",
    tagline: "Bir robotun en güçlü parçası: kalbi.",
    coverEmoji: "🤖",
    coverGradient: "from-emerald-500/20 via-cyan-500/10 to-indigo-500/20",
    durationLabel: "6-8 dk",
    pages: [
      { title: "Riko Uyanıyor", text: "Riko her sabah kendini kontrol ederdi: vidalar tamam, ışıklar tamam… Peki ya duygular?", illustration: "⚙️" },
      { title: "Kayıp Yıldız", text: "Bir gece gökyüzünden bir yıldız kaydı. Riko bunu bir işaret sandı.", illustration: "⭐" },
      { title: "Sessiz Park", text: "Park çok sessizdi. Riko bir bankta oturan çocuğu gördü: gözleri doluydu.", illustration: "🪑" },
      { title: "Nazik Soru", text: "Riko “Nasılsın?” dedi. Çocuk “Korkuyorum” diye fısıldadı.", illustration: "💬" },
      { title: "Küçük Cesaret", text: "Riko bir oyun önerdi: “Üç derin nefes alalım.” Birlikte nefes aldılar.", illustration: "🌬️" },
      { title: "Yıldız Gibi", text: "Çocuğun yüzü aydınlandı. “Teşekkür ederim,” dedi. Riko’nun ışığı daha parlak yandı.", illustration: "✨" },
      { title: "Yeni Görev", text: "Riko anladı: Gerçek görev, insanlara iyi hissettirmekti.", illustration: "🫶" },
      { title: "Mutlu Son", text: "O günden sonra Riko, her gün bir iyilik yaptı. Şehir, minik yıldızlarla doldu.", illustration: "🏙️" },
    ],
  },
  {
    id: "ormanin-kurallari",
    title: "Ormanın Kuralları",
    tagline: "Doğaya saygı, en büyük maceradır.",
    coverEmoji: "🌳",
    coverGradient: "from-green-500/20 via-lime-500/10 to-emerald-500/20",
    durationLabel: "5-7 dk",
    pages: [
      { title: "Piknik Günü", text: "Arda ailesiyle ormana gitti. Her yer mis gibi kokuyordu.", illustration: "🧺" },
      { title: "Çöpler Nerede?", text: "Arda “Çöplerimizi nereye atacağız?” diye sordu. Babası “Yanımızda götüreceğiz,” dedi.", illustration: "🗑️" },
      { title: "Sessiz Adımlar", text: "Ormanda bağırmak yerine fısıldadılar. Çünkü orası hayvanların eviymiş.", illustration: "🤫" },
      { title: "Kırılmayan Dal", text: "Arda dal koparmak istedi ama vazgeçti. “Ağaç canlanmak için o dala ihtiyaç duyar,” dedi.", illustration: "🌿" },
      { title: "Suya Saygı", text: "Dere kenarında taş attılar ama suyu kirletmediler. “Temiz su, herkesin hakkı,” dedi annesi.", illustration: "💧" },
      { title: "Teşekkür", text: "Arda ormana teşekkür etti: “Bizi ağırladığın için.”", illustration: "🙏" },
      { title: "Ev Gibi", text: "Orman geride kaldı ama Arda’nın kalbinde bir kural kaldı: “Doğayı koru.”", illustration: "💚" },
    ],
  },
  {
    id: "minik-sef",
    title: "Minik Şefin Tarifi",
    tagline: "Sabır + merak = lezzetli bir gün.",
    coverEmoji: "👩‍🍳",
    coverGradient: "from-orange-500/20 via-yellow-500/10 to-rose-500/20",
    durationLabel: "6-8 dk",
    pages: [
      { title: "Mutfakta Başlangıç", text: "Lina önlüğünü taktı. Bugün meyve salatası yapacaktı.", illustration: "🥗" },
      { title: "Yıkamak Şart", text: "Önce meyveleri yıkadı. “Temizlik, lezzetin ilk adımıdır,” dedi.", illustration: "🧼" },
      { title: "Kesme Tahtası", text: "Kesme tahtasını sabitledi. “Güvenlik her şeyden önce,” diye düşündü.", illustration: "🔪" },
      { title: "Renk Renk", text: "Elma, muz, çilek… Kase gökkuşağına döndü.", illustration: "🍓" },
      { title: "Bir Tutam Sabır", text: "Lina acele etmedi. Her parçayı özenle koydu.", illustration: "⏳" },
      { title: "Paylaşmak", text: "Tabağı masaya getirdi. “En güzel tarif paylaşmaktır,” dedi.", illustration: "🍽️" },
      { title: "Mutlu Son", text: "Herkes gülümsedi. Lina, “Yarın başka bir tarif!” diyerek not aldı.", illustration: "📝" },
    ],
  },
];


