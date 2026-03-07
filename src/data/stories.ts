/**
 * Demo hikaye verileri.
 * - Tamamen client-side (DB yok).
 * - Kısa sayfalar: çocuklar için okunabilir.
 * - Bazı sayfalarda seçim (branch) desteği var.
 */

export type StoryChoice = {
  label: string;
  nextPageIndex: number;
};

export type StoryPage = {
  title: string;
  text: string;
  illustration: string;
  choices?: StoryChoice[];
  /** Dallanma sonrası doğrusal akışı atlatmak için hedef sayfa indeksi */
  nextPageIndex?: number;
};

export type Story = {
  id: string;
  title: string;
  tagline: string;
  coverEmoji: string;
  coverGradient: string;
  durationLabel: string;
  category: "adventure" | "animal" | "sleep" | "education" | "friendship";
  pages: StoryPage[];
};

export const STORY_CATEGORIES = [
  { id: "all", label: "Tümü", emoji: "📚" },
  { id: "adventure", label: "Macera", emoji: "🗺️" },
  { id: "animal", label: "Hayvan", emoji: "🐾" },
  { id: "sleep", label: "Uyku", emoji: "🌙" },
  { id: "education", label: "Eğitici", emoji: "📖" },
  { id: "friendship", label: "Arkadaşlık", emoji: "🤝" },
];

export const STORIES: Story[] = [
  // ========== MACERA HİKAYELERİ ==========
  {
    id: "minik-kasif",
    title: "Minik Kaşif ve Harita",
    tagline: "Bir harita, üç yol, kocaman bir merak.",
    coverEmoji: "🗺️",
    coverGradient: "from-sky-500/20 via-indigo-500/10 to-purple-500/20",
    durationLabel: "6-8 dk",
    category: "adventure",
    pages: [
      { title: "Küçük Bir Sırt Çantası", text: "Mina bugün ilk kez kendi başına keşfe çıkacaktı. Çantasına su, küçük bir kurabiye ve en sevdiği büyüteci koydu.", illustration: "🎒" },
      { title: "Eski Bir Harita", text: "Masanın üstünde kıvrılmış bir harita buldu. Haritanın köşesinde bir not vardı: Merak eden bulur.", illustration: "🧭" },
      { title: "Üç Yol", text: "Harita üç yola ayrılıyordu: Orman, Sahil ve Tepe. Mina hangisini seçmeli diye düşündü.", illustration: "🛤️", choices: [
        { label: "Ormana git 🌲", nextPageIndex: 3 },
        { label: "Sahile git 🌊", nextPageIndex: 4 },
        { label: "Tepeye tırman ⛰️", nextPageIndex: 5 },
      ]},
      { title: "Ormanın Sesi", text: "Ormanda kuş sesleri ve yaprak hışırtıları vardı. Mina yavaş yürüdü, dinledi ve kimseyi ürkütmemeye dikkat etti.", illustration: "🌲", nextPageIndex: 6 },
      { title: "Sahilin Işıltısı", text: "Sahilde minik deniz kabukları parlıyordu. Mina kabukları toplamadı; sadece bakıp fotoğrafını zihnine çekti.", illustration: "🌊", nextPageIndex: 6 },
      { title: "Tepenin Manzarası", text: "Tepeye çıkınca her şey küçücük görünüyordu. Bazen en iyi fikirler yukarıdan bakınca gelir, dedi Mina.", illustration: "⛰️", nextPageIndex: 6 },
      { title: "Haritanın Sırrı", text: "Haritanın sonunda bir hazine yoktu: Mina'nın kendi cesareti ve dikkati vardı. Bu, en değerli keşifti.", illustration: "✨" },
      { title: "Mutlu Son", text: "Mina eve döndü, çantasını yerine koydu ve yeni bir sayfa açtı: Yarın başka bir macera.", illustration: "🏡" },
    ],
  },
  {
    id: "korsan-adasi",
    title: "Korsan Adasının Sırrı",
    tagline: "Hazine altın değil, dostluktur.",
    coverEmoji: "🏴‍☠️",
    coverGradient: "from-amber-500/20 via-orange-500/10 to-red-500/20",
    durationLabel: "7-9 dk",
    category: "adventure",
    pages: [
      { title: "Eski Gemi", text: "Kaptan Ela, küçük ahşap gemisiyle denize açıldı. Rüzgar saçlarını savuruyordu.", illustration: "⛵" },
      { title: "Gizemli Ada", text: "Ufukta yeşil bir ada belirdi. Haritada Sır Adası yazıyordu.", illustration: "🏝️" },
      { title: "Kumsal", text: "Kumsala ayak bastığında renkli taşlar gördü. Her biri farklı bir yöne işaret ediyordu.", illustration: "🐚", choices: [
        { label: "Mağaraya gir 🕯️", nextPageIndex: 3 },
        { label: "Kumsalda kal 🏖️", nextPageIndex: 4 },
      ]},
      { title: "Mağara Girişi", text: "Taşları takip etti ve karanlık bir mağaraya ulaştı. İçeriden hafif bir ışık geliyordu.", illustration: "🕯️", nextPageIndex: 5 },
      { title: "Kumsal Sürprizi", text: "Kumsalda kazarken eski bir şişe buldu. İçinde bir mesaj vardı: Gerçek hazine yanındadır.", illustration: "🏖️", nextPageIndex: 5 },
      { title: "Yeni Arkadaş", text: "Mağarada küçük bir papağan vardı. Merhaba! Ben Peri. Yalnızdım... dedi.", illustration: "🦜" },
      { title: "Gerçek Hazine", text: "Ela anladı: Gerçek hazine, yeni bir arkadaş bulmaktı.", illustration: "💎" },
      { title: "Birlikte Yolculuk", text: "Peri, Ela'nın omzuna kondu. Artık birlikte macera yapacaklardı.", illustration: "🌅" },
      { title: "Mutlu Son", text: "Gemi eve dönerken Ela düşündü: En iyi hazineler kalpte saklanır.", illustration: "❤️" },
    ],
  },
  {
    id: "uzay-yolculugu",
    title: "Uzay Yolculuğu",
    tagline: "Yıldızların ötesinde neler var?",
    coverEmoji: "🚀",
    coverGradient: "from-indigo-500/20 via-purple-500/10 to-pink-500/20",
    durationLabel: "8-10 dk",
    category: "adventure",
    pages: [
      { title: "Roket Hazır", text: "Astronot Can, roketine bindi. 3, 2, 1... Kalkış! diye bağırdı.", illustration: "🚀" },
      { title: "Dünyaya Veda", text: "Dünya giderek küçüldü. Mavi bir bilye gibi görünüyordu.", illustration: "🌍" },
      { title: "Ayda Mola", text: "Aya indi ve zıpladı. Yerçekimi az olunca çok yükseğe sıçradı!", illustration: "🌙", choices: [
        { label: "Marsa git 🔴", nextPageIndex: 3 },
        { label: "Jüpitere git 🟠", nextPageIndex: 4 },
      ]},
      { title: "Marsa Yolculuk", text: "Kırmızı gezegen yaklaştı. Marsın yüzeyi kumluydu.", illustration: "🔴", nextPageIndex: 5 },
      { title: "Jüpiter Macerası", text: "Jüpiter devasa bir gezegendi. Fırtınaları bile büyüktü! Can pencereden hayretle baktı.", illustration: "🪐", nextPageIndex: 5 },
      { title: "Uzaylı Dostlar", text: "Küçük yeşil varlıklar el salladı. Hoş geldin! dediler.", illustration: "👽" },
      { title: "Yıldız Toplama", text: "Can, bir yıldız tozu şişesi doldurdu. Hatıra olarak saklayacaktı.", illustration: "⭐" },
      { title: "Eve Dönüş", text: "Roket Dünyaya döndü. Can, penceresinden gökyüzüne baktı.", illustration: "🏠" },
      { title: "Mutlu Son", text: "Uzay çok büyük ama en güzel yer evim, dedi Can.", illustration: "💫" },
    ],
  },
  {
    id: "denizalti-macerasi",
    title: "Denizaltı Macerası",
    tagline: "Okyanusun derinliklerinde...",
    coverEmoji: "🐠",
    coverGradient: "from-cyan-500/20 via-blue-500/10 to-indigo-500/20",
    durationLabel: "6-8 dk",
    category: "adventure",
    pages: [
      { title: "Sarı Denizaltı", text: "Dalgıç Deniz, sarı denizaltısıyla daldı. Su giderek mavileşti.", illustration: "🚤" },
      { title: "Mercan Bahçesi", text: "Renkli mercanlar arasında yüzdü. Balıklar dans ediyordu.", illustration: "🪸" },
      { title: "Dev Kaplumbağa", text: "Yaşlı bir deniz kaplumbağasıyla tanıştı. Beni takip et, dedi kaplumbağa.", illustration: "🐢" },
      { title: "Batık Gemi", text: "Eski bir korsan gemisi gördüler. İçinde altın paralar vardı.", illustration: "⚓" },
      { title: "Yunus Arkadaşlar", text: "Yunuslar geldi ve denizaltının etrafında oynadı.", illustration: "🐬" },
      { title: "Gün Batımı", text: "Deniz yüzeyine çıktı. Güneş denize batıyordu.", illustration: "🌅" },
      { title: "Mutlu Son", text: "Deniz, okyanusu sevdi. Yarın tekrar dalacağım, dedi.", illustration: "🌊" },
    ],
  },

  // ========== HAYVAN HİKAYELERİ ==========
  {
    id: "ormanin-kurallari",
    title: "Ormanın Kuralları",
    tagline: "Doğaya saygı, en büyük maceradır.",
    coverEmoji: "🌳",
    coverGradient: "from-green-500/20 via-lime-500/10 to-emerald-500/20",
    durationLabel: "5-7 dk",
    category: "animal",
    pages: [
      { title: "Piknik Günü", text: "Arda ailesiyle ormana gitti. Her yer mis gibi kokuyordu.", illustration: "🧺" },
      { title: "Çöpler Nerede?", text: "Arda çöplerimizi nereye atacağız diye sordu. Babası yanımızda götüreceğiz dedi.", illustration: "🗑️" },
      { title: "Sessiz Adımlar", text: "Ormanda bağırmak yerine fısıldadılar. Çünkü orası hayvanların eviymiş.", illustration: "🤫" },
      { title: "Kırılmayan Dal", text: "Arda dal koparmak istedi ama vazgeçti. Ağaç canlanmak için o dala ihtiyaç duyar.", illustration: "🌿" },
      { title: "Suya Saygı", text: "Dere kenarında taş attılar ama suyu kirletmediler. Temiz su, herkesin hakkı.", illustration: "💧" },
      { title: "Teşekkür", text: "Arda ormana teşekkür etti: Bizi ağırladığın için.", illustration: "🙏" },
      { title: "Ev Gibi", text: "Orman geride kaldı ama Ardanın kalbinde bir kural kaldı: Doğayı koru.", illustration: "💚" },
    ],
  },
  {
    id: "kayip-yavru",
    title: "Kayıp Yavru Kedi",
    tagline: "Her kayıp, bir buluşmadır.",
    coverEmoji: "🐱",
    coverGradient: "from-orange-500/20 via-amber-500/10 to-yellow-500/20",
    durationLabel: "5-7 dk",
    category: "animal",
    pages: [
      { title: "Yağmurlu Gün", text: "Yağmur yağıyordu. Elif bahçede küçük bir miyavlama duydu.", illustration: "🌧️" },
      { title: "Islak Tüyler", text: "Çalıların arasında küçük turuncu bir kedi yavrusu titriyordu.", illustration: "🐈" },
      { title: "Sıcak Havlu", text: "Elif yavruyu içeri aldı ve yumuşak bir havluyla sardı.", illustration: "🧣" },
      { title: "Süt ve Sevgi", text: "Bir kase ılık süt verdi. Yavru mutlu mutlu içti.", illustration: "🥛" },
      { title: "İsim Arayışı", text: "Sana ne isim versem diye düşündü. Hangi isim yakışır?", illustration: "💭", choices: [
        { label: "Pamuk olsun 🤍", nextPageIndex: 5 },
        { label: "Tarçın olsun 🧡", nextPageIndex: 6 },
      ]},
      { title: "Pamuk", text: "Bembeyaz patileri vardı. Pamuk, çok tatlı bir isim! Elif Pamuk'u kucakladı.", illustration: "🤍", nextPageIndex: 7 },
      { title: "Tarçın", text: "Turuncu tüyleri tarçın gibi kokuyordu. Tarçın, çok güzel bir isim! Elif Tarçın'ı kucakladı.", illustration: "🧡", nextPageIndex: 7 },
      { title: "Mutlu Son", text: "Her gece birlikte uyudular. Yeni arkadaş mırıldanıyordu.", illustration: "😺" },
    ],
  },
  {
    id: "ari-maya",
    title: "Arı Mayanın Günü",
    tagline: "Küçük işler, büyük sonuçlar.",
    coverEmoji: "🐝",
    coverGradient: "from-yellow-500/20 via-amber-500/10 to-orange-500/20",
    durationLabel: "5-6 dk",
    category: "animal",
    pages: [
      { title: "Sabah Uyanışı", text: "Arı Maya güneşle uyandı. Bugün çok iş vardı.", illustration: "🌅" },
      { title: "Çiçek Bahçesi", text: "İlk durak papatya tarlasıydı. Maya polen topladı.", illustration: "🌼" },
      { title: "Gül Bahçesi", text: "Kırmızı güller çok güzel kokuyordu. Maya mutlu oldu.", illustration: "🌹" },
      { title: "Arkadaşlarla", text: "Diğer arılarla karşılaştı. Hep birlikte çalıştılar.", illustration: "🐝" },
      { title: "Kovana Dönüş", text: "Akşam oldu, Maya kovana döndü. Bal yapmak için.", illustration: "🍯" },
      { title: "Mutlu Son", text: "Küçük emekler, tatlı sonuçlar verir, dedi Maya.", illustration: "✨" },
    ],
  },
  {
    id: "penguen-pingu",
    title: "Penguen Pingunun Macerası",
    tagline: "Soğuk buzlarda sıcak kalpler.",
    coverEmoji: "🐧",
    coverGradient: "from-sky-500/20 via-blue-500/10 to-cyan-500/20",
    durationLabel: "6-7 dk",
    category: "animal",
    pages: [
      { title: "Buzul Evi", text: "Pingu, Antartikada yaşıyordu. Her yer bembeyazdı.", illustration: "🏔️" },
      { title: "Kayma Zamanı", text: "Kardeşleriyle buzda kaydılar. Çok eğlenceliydi!", illustration: "⛷️" },
      { title: "Balık Avı", text: "Denize daldı ve balık yakaladı. Ailesiyle paylaştı.", illustration: "🐟" },
      { title: "Fırtına", text: "Kar fırtınası başladı. Herkes birbirine sokuldu.", illustration: "🌨️" },
      { title: "Sıcaklık", text: "Birlikte durarak ısındılar. Aile önemliydi.", illustration: "❤️" },
      { title: "Güneşli Gün", text: "Fırtına geçti. Güneş buzları parlattı.", illustration: "☀️" },
      { title: "Mutlu Son", text: "Pingu ailesini sevdi. En iyi yer, sevdiklerimin yanı, dedi.", illustration: "🐧" },
    ],
  },
  {
    id: "fil-memo",
    title: "Fil Memonun Hafızası",
    tagline: "Unutmak yok, sevgi var.",
    coverEmoji: "🐘",
    coverGradient: "from-gray-500/20 via-slate-500/10 to-zinc-500/20",
    durationLabel: "5-6 dk",
    category: "animal",
    pages: [
      { title: "Büyük Fil", text: "Memo, savannanın en büyük filiydi. Ama kalbi daha büyüktü.", illustration: "🐘" },
      { title: "Su Kaynağı", text: "Kuraklık vardı. Memo su kaynağını hatırlıyordu.", illustration: "💧" },
      { title: "Yol Gösterici", text: "Diğer hayvanları suya götürdü. Herkes mutlu oldu.", illustration: "🦒" },
      { title: "Teşekkür", text: "Hayvanlar teşekkür etti. Memo utandı.", illustration: "🙏" },
      { title: "Gece", text: "Yıldızların altında uyudu. Rüyasında annesi vardı.", illustration: "🌟" },
      { title: "Mutlu Son", text: "Hatırlamak güzel, paylaşmak daha güzel, dedi Memo.", illustration: "💝" },
    ],
  },

  // ========== UYKU HİKAYELERİ ==========
  {
    id: "uyku-perisi",
    title: "Uyku Perisi Lila",
    tagline: "Tatlı rüyalar, huzurlu geceler.",
    coverEmoji: "🧚",
    coverGradient: "from-purple-500/20 via-pink-500/10 to-indigo-500/20",
    durationLabel: "4-5 dk",
    category: "sleep",
    pages: [
      { title: "Gece Oldu", text: "Güneş battı, yıldızlar çıktı. Uyku vakti geldi.", illustration: "🌙" },
      { title: "Peri Geliyor", text: "Uyku Perisi Lila, pırıl pırıl kanatlarıyla geldi.", illustration: "✨" },
      { title: "Uyku Tozu", text: "Gözlerine hafif uyku tozu serpti. Gözler ağırlaştı.", illustration: "💫" },
      { title: "Yumuşak Bulut", text: "Rüyada yumuşak bulutların üstünde uçtun.", illustration: "☁️" },
      { title: "Tatlı Rüya", text: "Çikolata nehirleri, pamuk şeker ağaçları...", illustration: "🍫" },
      { title: "Huzur", text: "Her şey sakin, her şey güzel. Uyu, güzel çocuk.", illustration: "😴" },
    ],
  },
  {
    id: "yildiz-cocugu",
    title: "Yıldız Çocuğu",
    tagline: "Her çocuk bir yıldız kadar özel.",
    coverEmoji: "⭐",
    coverGradient: "from-indigo-500/20 via-violet-500/10 to-purple-500/20",
    durationLabel: "4-5 dk",
    category: "sleep",
    pages: [
      { title: "Gökyüzü", text: "Gökyüzünde milyonlarca yıldız vardı. Biri seni izliyordu.", illustration: "🌌" },
      { title: "Senin Yıldızın", text: "O yıldız, doğduğun gece parlayan yıldızdı.", illustration: "⭐" },
      { title: "Işık", text: "Her gece sana ışık gönderiyordu. Koruma ışığı.", illustration: "💡" },
      { title: "Rüya", text: "Rüyanda yıldızınla konuştun. Seni seviyorum, dedi.", illustration: "💬" },
      { title: "Güvende", text: "Yıldızın hep seninle. Gözlerini kapat, hisset.", illustration: "🤗" },
      { title: "İyi Geceler", text: "Uyu güzelce. Yıldızın parlıyor.", illustration: "🌟" },
    ],
  },
  {
    id: "ay-tavsan",
    title: "Ay Tavşanı",
    tagline: "Ayda bir tavşan yaşarmış...",
    coverEmoji: "🐰",
    coverGradient: "from-slate-500/20 via-gray-500/10 to-zinc-500/20",
    durationLabel: "4-5 dk",
    category: "sleep",
    pages: [
      { title: "Dolunay", text: "Bu gece dolunay vardı. Ay çok parlaktı.", illustration: "🌕" },
      { title: "Tavşan", text: "Ayda bir tavşan yaşıyordu. Adı Pamuktu.", illustration: "🐇" },
      { title: "Havuç Bahçesi", text: "Pamuk, Ayda havuç yetiştiriyordu. Sihirli havuçlar.", illustration: "🥕" },
      { title: "Dilek", text: "Her gece çocukların dileklerini dinliyordu.", illustration: "🙏" },
      { title: "Senin Dileğin", text: "Bu gece senin dileğini duydu. Gerçekleşecek.", illustration: "✨" },
      { title: "İyi Geceler", text: "Pamuk sana el salladı. İyi geceler, dedi.", illustration: "👋" },
    ],
  },
  {
    id: "bulut-yatak",
    title: "Bulut Yatak",
    tagline: "En yumuşak yatak gökyüzünde.",
    coverEmoji: "☁️",
    coverGradient: "from-sky-500/20 via-blue-500/10 to-cyan-500/20",
    durationLabel: "3-4 dk",
    category: "sleep",
    pages: [
      { title: "Uçuş", text: "Gözlerini kapattın ve uçmaya başladın.", illustration: "🕊️" },
      { title: "Bulutlar", text: "Yumuşak bulutlara ulaştın. Pamuk gibiydi.", illustration: "☁️" },
      { title: "Yatak", text: "Bir bulutun üstüne uzandın. Çok rahattı.", illustration: "🛏️" },
      { title: "Rüzgar", text: "Hafif rüzgar seni salladı. Beşik gibi.", illustration: "🌬️" },
      { title: "Uyku", text: "Gözlerin kapandı. Derin uykuya daldın.", illustration: "😴" },
    ],
  },

  // ========== EĞİTİCİ HİKAYELER ==========
  {
    id: "renkli-sehir",
    title: "Renkli Şehirde Bir Gün",
    tagline: "Renkler kaybolunca, küçük bir fikir dünyayı değiştirir.",
    coverEmoji: "🏙️",
    coverGradient: "from-amber-500/20 via-rose-500/10 to-fuchsia-500/20",
    durationLabel: "7-9 dk",
    category: "education",
    pages: [
      { title: "Solmuş Sabah", text: "Şehir bugün griydi. Duvarlar, dükkanlar, hatta balonlar... Hepsi sanki rengini unutmuştu.", illustration: "🌫️" },
      { title: "Küçük Bir Fırça", text: "Ece cebinden minicik bir fırça çıkardı. Bir yerden başlamalıyım, dedi.", illustration: "🖌️" },
      { title: "İlk Nokta", text: "Kaldırım taşına küçük bir sarı nokta kondurdu. Güneş gibi parladı.", illustration: "🟡" },
      { title: "Renk Bulaşıcıdır", text: "Sarı noktanın yanına mavi eklendi. Sonra pembe... Renkler birbirini çağırdı.", illustration: "🟦" },
      { title: "Komşular Katılır", text: "Bir komşu çiçek çizdi. Bir diğeri kuş yaptı. Şehir birlikte güzelleşti.", illustration: "🌸" },
      { title: "Büyük Duvar", text: "Sonunda kocaman duvar boştu. Ece birlikte yapalım deyince herkes sıraya girdi.", illustration: "🧱" },
      { title: "Yeni Şehir", text: "Duvar bir masala döndü. Renkler geri geldi, çünkü paylaşılmıştı.", illustration: "🌈" },
      { title: "Mutlu Son", text: "Ece evine dönerken şunu düşündü: Bir renk bile, bir şehri değiştirebilir.", illustration: "💡" },
    ],
  },
  {
    id: "yildiz-robot",
    title: "Yıldız Robot Riko",
    tagline: "Bir robotun en güçlü parçası: kalbi.",
    coverEmoji: "🤖",
    coverGradient: "from-emerald-500/20 via-cyan-500/10 to-indigo-500/20",
    durationLabel: "6-8 dk",
    category: "education",
    pages: [
      { title: "Riko Uyanıyor", text: "Riko her sabah kendini kontrol ederdi: vidalar tamam, ışıklar tamam... Peki ya duygular?", illustration: "⚙️" },
      { title: "Kayıp Yıldız", text: "Bir gece gökyüzünden bir yıldız kaydı. Riko bunu bir işaret sandı.", illustration: "⭐" },
      { title: "Sessiz Park", text: "Park çok sessizdi. Riko bir bankta oturan çocuğu gördü: gözleri doluydu.", illustration: "🪑" },
      { title: "Nazik Soru", text: "Riko nasılsın dedi. Çocuk korkuyorum diye fısıldadı.", illustration: "💬" },
      { title: "Küçük Cesaret", text: "Riko bir oyun önerdi: Üç derin nefes alalım. Birlikte nefes aldılar.", illustration: "🌬️" },
      { title: "Yıldız Gibi", text: "Çocuğun yüzü aydınlandı. Teşekkür ederim, dedi. Rikonun ışığı daha parlak yandı.", illustration: "✨" },
      { title: "Yeni Görev", text: "Riko anladı: Gerçek görev, insanlara iyi hissettirmekti.", illustration: "🫶" },
      { title: "Mutlu Son", text: "O günden sonra Riko, her gün bir iyilik yaptı. Şehir, minik yıldızlarla doldu.", illustration: "🏙️" },
    ],
  },
  {
    id: "minik-sef",
    title: "Minik Şefin Tarifi",
    tagline: "Sabır + merak = lezzetli bir gün.",
    coverEmoji: "👩‍🍳",
    coverGradient: "from-orange-500/20 via-yellow-500/10 to-rose-500/20",
    durationLabel: "6-8 dk",
    category: "education",
    pages: [
      { title: "Mutfakta Başlangıç", text: "Lina önlüğünü taktı. Bugün meyve salatası yapacaktı.", illustration: "🥗" },
      { title: "Yıkamak Şart", text: "Önce meyveleri yıkadı. Temizlik, lezzetin ilk adımıdır, dedi.", illustration: "🧼" },
      { title: "Kesme Tahtası", text: "Kesme tahtasını sabitledi. Güvenlik her şeyden önce, diye düşündü.", illustration: "🔪" },
      { title: "Renk Renk", text: "Elma, muz, çilek... Kase gökkuşağına döndü.", illustration: "🍓" },
      { title: "Bir Tutam Sabır", text: "Lina acele etmedi. Her parçayı özenle koydu.", illustration: "⏳" },
      { title: "Paylaşmak", text: "Tabağı masaya getirdi. En güzel tarif paylaşmaktır, dedi.", illustration: "🍽️" },
      { title: "Mutlu Son", text: "Herkes gülümsedi. Lina, yarın başka bir tarif diyerek not aldı.", illustration: "📝" },
    ],
  },
  {
    id: "sayi-kahramanlari",
    title: "Sayı Kahramanları",
    tagline: "1den 10a eğlenceli yolculuk.",
    coverEmoji: "🔢",
    coverGradient: "from-blue-500/20 via-indigo-500/10 to-violet-500/20",
    durationLabel: "5-6 dk",
    category: "education",
    pages: [
      { title: "Bir Güneş", text: "Gökyüzünde 1 güneş vardı. Her şeyi aydınlatıyordu.", illustration: "☀️" },
      { title: "İki Göz", text: "Senin 2 gözün var. Dünyayı görüyorsun.", illustration: "👀" },
      { title: "Üç Renk", text: "Trafik lambasında 3 renk: kırmızı, sarı, yeşil.", illustration: "🚦" },
      { title: "Dört Mevsim", text: "Yılda 4 mevsim var: ilkbahar, yaz, sonbahar, kış.", illustration: "🍂" },
      { title: "Beş Parmak", text: "Elinde 5 parmak var. Say bakalım!", illustration: "✋" },
      { title: "On Yıldız", text: "Gökyüzünde 10 yıldız saydın. Aferin sana!", illustration: "⭐" },
      { title: "Mutlu Son", text: "Sayılar her yerde! Etrafına bak ve say.", illustration: "🎉" },
    ],
  },

  // ========== ARKADAŞLIK HİKAYELERİ ==========
  {
    id: "en-iyi-arkadas",
    title: "En İyi Arkadaş",
    tagline: "Arkadaşlık, en güzel hazine.",
    coverEmoji: "🤝",
    coverGradient: "from-pink-500/20 via-rose-500/10 to-red-500/20",
    durationLabel: "6-7 dk",
    category: "friendship",
    pages: [
      { title: "Yeni Okul", text: "Zeynep yeni okulunda hiç kimseyi tanımıyordu. Biraz korkuyordu.", illustration: "🏫" },
      { title: "Yalnız Masa", text: "Kantinde tek başına oturdu. Herkes gruplar halindeydi.", illustration: "🪑" },
      { title: "Gülümseyen Yüz", text: "Bir kız yanına geldi. Merhaba, ben Ayşe. Oturabilir miyim?", illustration: "😊" },
      { title: "İlk Sohbet", text: "Konuştular. İkisi de kedileri seviyordu!", illustration: "🐱" },
      { title: "Teneffüs", text: "Birlikte oynadılar. Zeynep artık gülüyordu.", illustration: "⚽" },
      { title: "Her Gün", text: "Her gün birlikte oldular. Sırlar paylaştılar.", illustration: "💕" },
      { title: "Mutlu Son", text: "En iyi arkadaşlar, en zor günlerde bulunur, dedi Zeynep.", illustration: "🌈" },
    ],
  },
  {
    id: "farkli-ama-ayni",
    title: "Farklı Ama Aynı",
    tagline: "Farklılıklar güzeldir.",
    coverEmoji: "🌍",
    coverGradient: "from-green-500/20 via-teal-500/10 to-cyan-500/20",
    durationLabel: "6-7 dk",
    category: "friendship",
    pages: [
      { title: "Yeni Komşu", text: "Yan eve yeni bir aile taşındı. Farklı bir ülkedendiler.", illustration: "🏠" },
      { title: "Farklı Dil", text: "Ali, yeni komşu çocukla konuşamadı. Dilleri farklıydı.", illustration: "💬" },
      { title: "Futbol Topu", text: "Ama ikisi de futbol seviyordu. Top ortak dildi.", illustration: "⚽" },
      { title: "Yemek Paylaşımı", text: "Komşu aile yemek getirdi. Çok lezzetliydi!", illustration: "🍲" },
      { title: "Öğrenme", text: "Ali birkaç kelime öğrendi. Komşu da Türkçe öğrendi.", illustration: "📚" },
      { title: "Arkadaş", text: "Artık en iyi arkadaştılar. Dil engel değildi.", illustration: "🤝" },
      { title: "Mutlu Son", text: "Farklı olmak, arkadaş olmaya engel değil, dedi Ali.", illustration: "❤️" },
    ],
  },
  {
    id: "kavga-ve-baris",
    title: "Kavga ve Barış",
    tagline: "Özür dilemek cesaret ister.",
    coverEmoji: "🕊️",
    coverGradient: "from-amber-500/20 via-yellow-500/10 to-lime-500/20",
    durationLabel: "5-6 dk",
    category: "friendship",
    pages: [
      { title: "Oyun Zamanı", text: "Berk ve Cem her gün birlikte oynardı. En iyi arkadaştılar.", illustration: "🎮" },
      { title: "Kavga", text: "Bir gün oyuncak yüzünden kavga ettiler. İkisi de kızdı.", illustration: "😠" },
      { title: "Yalnızlık", text: "Bir hafta konuşmadılar. İkisi de üzgündü.", illustration: "😢" },
      { title: "Özlem", text: "Berk arkadaşını özledi. Keşke kavga etmeseydik, dedi.", illustration: "💭", choices: [
        { label: "Özür dile 🙏", nextPageIndex: 4 },
        { label: "Mektup yaz ✉️", nextPageIndex: 5 },
      ]},
      { title: "Özür", text: "Berk cesaret topladı: Özür dilerim. Cem gülümsedi.", illustration: "🙏", nextPageIndex: 6 },
      { title: "Mektup", text: "Berk bir mektup yazdı: Seni çok özledim, arkadaşım. Cem mektubu okudu ve gülümsedi.", illustration: "✉️", nextPageIndex: 6 },
      { title: "Barış", text: "Sarıldılar. Arkadaşlık, kavgadan güçlü çıktı.", illustration: "🤗" },
      { title: "Mutlu Son", text: "Özür dilemek zayıflık değil, güçtür, dedi ikisi birden.", illustration: "💪" },
    ],
  },
  {
    id: "paylasim",
    title: "Paylaşımın Gücü",
    tagline: "Paylaşınca çoğalır.",
    coverEmoji: "🎁",
    coverGradient: "from-rose-500/20 via-pink-500/10 to-fuchsia-500/20",
    durationLabel: "5-6 dk",
    category: "friendship",
    pages: [
      { title: "Doğum Günü", text: "Selinin doğum günüydü. Çok hediye aldı.", illustration: "🎂" },
      { title: "Çok Oyuncak", text: "Odası oyuncaklarla doldu. Hepsini oynayamıyordu.", illustration: "🧸" },
      { title: "Fikir", text: "Annesi bir fikir verdi: Bazılarını ihtiyacı olanlara verelim.", illustration: "💡" },
      { title: "Bağış", text: "Selin, bazı oyuncakları çocuk evine götürdü.", illustration: "📦" },
      { title: "Mutluluk", text: "Çocukların gözleri parladı. Selin çok mutlu oldu.", illustration: "😊" },
      { title: "Mutlu Son", text: "Paylaşınca mutluluk çoğalıyor, dedi Selin.", illustration: "❤️" },
    ],
  },
];
