import type { Story } from '../stories';

export const animalStories: Story[] = [
  {
    id:'ormanin-kurallari',title:'Ormanın Kuralları',tagline:'Sessiz bir pikniğin sürpriz misafiri.',category:'animal',artwork:'trees',coverScene:'forest',reflection:'Ormanda sessiz kalınca Arda neleri fark etti?',
    pages:[
      {title:'Piknik yeri',illustration:'forest',text:'Arda, ailesiyle ormanda piknik için yer arıyordu. En güzel gölgeli ağacın altında bir sürü kozalak vardı. Arda hepsini kenara atmak istedi.\n\nBabası bir kozalağı eline aldı. Üzerinde küçük diş izleri vardı. “Burası birinin yemek masası olabilir,” dedi. Arda ağacın dallarına baktı. Hiç kimse görünmüyordu.'},
      {title:'Bekleyince görünen',illustration:'forest',text:'Örtüyü biraz uzağa serdiler. Arda bağırarak kuzenini çağırmak üzereyken dallarda bir kıpırtı gördü. Sesini alçalttı. Küçük bir sincap ağacın gövdesinden indi.\n\nSincap kozalağı patileriyle çevirdi. Arda kendi sandviçinden vermek istedi. Annesi, “Kendi yiyeceğini bulmasına izin verelim,” dedi. Uzaktan izlemek de çok eğlenceliydi.'},
      {title:'Rüzgârla uçan poşet',illustration:'garden',text:'Yemekten sonra rüzgâr boş bir poşeti dereye doğru sürükledi. Arda suya yaklaşmadan annesine seslendi. Birlikte güvenli kıyıdan poşeti aldılar.\n\nArda yanındaki torbaya paketlerini, peçetelerini ve poşeti koydu. Sonra piknik yerini tekrar dolaştı. Geride yalnızca örtünün otlarda bıraktığı ince iz kalmıştı.'},
      {title:'Bir başka ev',illustration:'forest',text:'Yola çıkarken sincap yine göründü. Arda bu kez el sallamak yerine sessizce gülümsedi. Sincap kozalağıyla ağaca tırmandı.\n\nArabada Arda, “Bugün misafirdik,” dedi. Babası ormana baktı. “Kimin evindeydik?” Arda bir sincap, bir kuş ve derenin resmini çizdi. Cevabı defterine sığmayacak kadar uzundu.'},
    ],
  },
  {
    id:'kayip-yavru',title:'Kayıp Yavru Kedi',tagline:'Bir miyavlama, bütün sokağı bir araya getirir.',category:'animal',artwork:'cat',coverScene:'town',reflection:'Elif yavruyu hemen sahiplenmek yerine neden önce yardım aradı?',
    pages:[
      {title:'Yağmurun içindeki ses',illustration:'garden',text:'Yağmur oluklardan tıp tıp akarken Elif kapının önünde ince bir miyavlama duydu. Çalının altında turuncu bir yavru vardı. Elif onu çekip çıkarmaya çalışmadı; annesini çağırdı.\n\nBirlikte güvenli bir kutuya kuru havlu koydular. Yavru kendi adımıyla havluya geçti. Annesi çevrede başka kedi olup olmadığına baktı.'},
      {title:'Kimin küçük misafiri?',illustration:'town',text:'Elif, “Onu odamda tutabilir miyim?” diye sordu. Annesi önce bir veterinere danışacaklarını, yavrunun annesini ve sahibini araştıracaklarını söyledi. Yavruya uygun bakım için yardım aldılar.\n\nElif veterinerin önerdiği su kabını yerleştirdi. Sonra bir kâğıda kedinin resmini çizdi. Kedi havlunun içinde uyuklarken ikisi de fısıldayarak konuşuyordu.',choices:[{label:'Komşulara resmi göster',nextPageIndex:2},{label:'Annesiyle duyuru hazırla',nextPageIndex:3}]},
      {title:'Mavi kapının ardı',illustration:'town',text:'Elif annesiyle komşuların kapısını çaldı. Mavi kapılı evde yaşayan Nehir resmi görünce gözleri büyüdü. “Bu Tarçın! Kapı açık kalınca çıkmıştı.”\n\nNehir’in babası yavrunun eski fotoğrafını gösterdi. Elif, beyaz patilerini fotoğraftakilerle karşılaştırdı. Aynı minicik çoraplar vardı.',nextPageIndex:4},
      {title:'Resmin altındaki not',illustration:'workshop',text:'Elif duyuruya yalnızca kedinin resmini ve annesinin izin verdiği iletişim yolunu koydu. Annesi bunu mahalle grubuyla paylaştı. Çok geçmeden Nehir’in babası aradı.\n\nEski fotoğraflarda yavrunun beyaz patileri görünüyordu. Elif gülümsedi. Kâğıda büyük harflerle yeni bir not yazdı: “Tarçın’ın ailesi bulundu.”',nextPageIndex:4},
      {title:'Geri gelen mırıltı',illustration:'garden',text:'Tarçın, Nehir’in sesini duyunca kutudan başını kaldırdı. Elif onu bırakırken biraz üzüldü. Nehir, “İstersen ailelerimizle birlikte onu ziyaret edebilirsin,” dedi.\n\nErtesi hafta Tarçın evinin penceresinde uyuyordu. Elif camın arkasından el salladı. Bir arkadaş edinmişti; ama daha güzeli, küçük misafirinin eve dönmesine yardım etmişti.'},
    ],
  },
  {
    id:'ari-maya',title:'Arı Maya’nın Günü',tagline:'Bir damla nektarın uzun yolculuğu.',category:'animal',artwork:'bee',coverScene:'garden',reflection:'Maya’nın çiçekler arasında dolaşması bahçeye nasıl yardım etti?',
    pages:[
      {title:'Boş duran dal',illustration:'garden',text:'Arı Maya her sabah aynı elma ağacına uğrardı. Bu yıl ağaç çiçek açmıştı, ama bahçenin yeni bölümünde arı sesi yoktu. Maya o tarafa uçtu.\n\nÇiçeklerin arasında sadece iki küçük papatya buldu. “Burada da yiyecek var, fakat az,” diye düşündü. Kanatlarındaki polenleri temizleyip kovanın yolunu tuttu.'},
      {title:'Kovandaki haber',illustration:'forest',text:'Maya kovanda bulduğu yiyecek yerini diğer arılara gösteren hareketler yaptı. Sonra birlikte bahçeye döndüler. Arılar çiçekten çiçeğe kondukça polen taşıyordu.\n\nBahçıvan küçük kız bunu uzaktan izledi. Arıları kovalamadı. Babasıyla bahçenin boş kısmına farklı zamanlarda açan çiçekler dikmeye karar verdi.'},
      {title:'Yeni duraklar',illustration:'garden',text:'Haftalar geçti. Yeni çiçekler açtı. Maya artık papatyalardan sonra mor lavantalara da uğrayabiliyordu. Elma ağacının dallarında küçük meyveler belirdi.\n\nKız, “Bunları biz mi yaptık?” diye sordu. Babası bir arıyı gösterdi. “Birçok canlının payı var.” Maya onların sesini anlamadı, ama çiçekleri bulduğuna sevinmişti.'},
      {title:'Bahçenin küçük çalışanı',illustration:'night',text:'Akşam Maya kovana döndü. Gün boyunca topladığı nektarı diğer arılarla paylaştı. Dışarıda bahçıvan kız, elma ağacının altına küçük bir tabela astı: “Arılar çalışıyor. Uzaktan izleyelim.”\n\nErtesi sabah Maya yeni çiçeklere doğru uçtu. Bahçede yalnız değildi. Birbirini tanımayan pek çok canlı aynı bahçeyi büyütüyordu.'},
    ],
  },
  {
    id:'penguen-pingu',title:'Penguen Pingu’nun Macerası',tagline:'Karın içinde kaybolan bir iz.',category:'animal',artwork:'penguin',coverScene:'snow',reflection:'Pingu fırtınada neden tek başına uzaklaşmadı?',
    pages:[
      {title:'Beyaz bir sabah',illustration:'snow',text:'Pingu’nun ilk işi annesinin sesini dinlemekti. Penguen kolonisinde herkes birbirine benziyordu, ama annesinin çağrısını tanıyordu. Bugün o sesin yanında daha ince bir ses vardı.\n\nKardeşi ilk kez grubun ortasında yürümeye çalışıyordu. Pingu onun yanında küçük adımlar attı. Karın üzerinde iki sıra ayak izi oluştu.'},
      {title:'Silinen ayak izleri',illustration:'snow',text:'Rüzgâr güçlenince kar, izleri örtmeye başladı. Kardeşi kayıp biraz geride kaldı. Pingu onu aramak için uzağa koşmadı. Annesine seslendi ve kardeşinin son durduğu yeri gösterdi.\n\nAnnesi birkaç adım ötede yavruyu buldu. Pingu onun çağrısını yine duydu. Artık gözlerinden çok kulaklarına güveniyordu.'},
      {title:'Sıcak çember',illustration:'snow',text:'Penguenler birbirine yaklaşarak rüzgârın önüne bir çember oluşturdu. Pingu kardeşiyle çemberin içine girdi. Dışarıdaki yetişkinler sırayla yer değiştiriyordu.\n\nKardeşi, Pingu’nun kanadına sokuldu. Pingu onu güldürmek için sabah yürüdükleri küçük adımları taklit etti. Fırtınanın sesi hâlâ vardı, ama artık aralarında boşluk yoktu.'},
      {title:'Yeniden görünen yol',illustration:'snow',text:'Rüzgâr dindiğinde karın üstünde güneş parladı. Pingu ve kardeşi annelerinin yanında yeni izler bıraktı. Eski izler kaybolmuştu; birlikte yeni bir yol açabiliyorlardı.\n\nPingu o gün kaymayı değil, bir sesi dikkatle dinlemeyi öğrendi. Kardeşi her seslendiğinde başını çeviriyor, cevap vermek için kendi küçük çağrısını çıkarıyordu.'},
    ],
  },
  {
    id:'fil-memo',title:'Fil Memo’nun Hafızası',tagline:'Eski bir anı, yeni bir su yolu.',category:'animal',artwork:'elephant',coverScene:'savanna',reflection:'Memo’nun hatırladığı yolu arkadaşlarının bilgisi nasıl tamamladı?',
    pages:[
      {title:'Kuruyan gölcük',illustration:'savanna',text:'Memo, her sabah su içtiği gölcüğün kıyısında durdu. Su çok azalmıştı. Küçük hayvanlar çamurlu kenarda bekliyordu. Memo hortumunu kaldırıp uzak tepelere baktı.\n\nAnnesiyle yıllar önce yürüdüğü bir yol aklına geldi. Yolun sonunda gölgeli bir su kaynağı vardı. Ama hangi tepenin arkasında olduğunu tam hatırlayamıyordu.'},
      {title:'Tek bir anı yetmedi',illustration:'forest',text:'Memo, aklındaki büyük ağacı tarif etti. Zürafa uzaktan benzer bir ağaç gördüğünü söyledi. Kuşlar da o tarafta yeşil otlar bulunduğunu anlattı.\n\nBirlikte yola çıktılar. Memo en yavaş yürüyen yavrunun yanında kaldı. Eski yol sandığı kadar açık değildi. Yeni düşen dalların etrafından dolanmaları gerekti.'},
      {title:'Suyun kokusu',illustration:'savanna',text:'Son tepeye geldiklerinde Memo durdu. Rüzgâr nemli bir toprak kokusu taşıyordu. Kuşlar aşağıdaki sazları gösterdi. Aradıkları kaynak oradaydı.\n\nMemo hemen suya girmedi. Küçük hayvanların ulaşabileceği kıyıyı bulmalarını bekledi. Sonra herkes sırayla su içti. Hafızasındaki yol artık yeni arkadaşlarının izleriyle doluydu.'},
      {title:'Yeni bir hatıra',illustration:'night',text:'Akşam Memo, yavruya gölgeli ağacı gösterdi. “Bu ağacı hatırla,” dedi. “Ama bir gün yer değişirse başkalarına da sor.”\n\nYavru ağacın yaprağını hortumuyla kokladı. Memo gülümsedi. Bu kez hatırlayacağı yalnızca su kaynağı değildi: Yolu tek başına değil, arkadaşlarının bilgisiyle bulmuşlardı.'},
    ],
  },
  {
    id:'kaplumbaga-yavrusu',title:'Kaplumbağa Yavrusunun Yolculuğu',tagline:'Küçük adımlarla doğru ışığa.',category:'animal',artwork:'turtle',coverScene:'shore',reflection:'Sahildeki insanlar kaplumbağalara dokunmadan nasıl yardım etti?',
    pages:[
      {title:'Kumun altındaki hareket',illustration:'shore',text:'Gece, kumsalda küçücük bir kabuk kıpırdadı. Deniz kaplumbağası yavrusu yumurtasından çıkmıştı. Kardeşleriyle birlikte kumun üstüne ulaştı. Önlerinde uzun, karanlık bir yol vardı.\n\nDenizin ufku hafifçe parlıyordu. Ama kıyıdaki bir lambanın ışığı daha güçlüydü. Yavru bir an o tarafa döndü.'},
      {title:'Yanlış yöndeki parlaklık',illustration:'night',text:'Sahili izleyen gönüllü, yavruların lamba yönüne gittiğini fark etti. Yakındaki görevliye haber verdi. Gereksiz kıyı ışığı kapatıldı; insanlar uzakta sessizce bekledi.\n\nYavru denizin üzerindeki doğal aydınlığı yeniden gördü. Küçük yüzgeçlerini kuma bastırdı. Her adımda biraz daha doğru yöne ilerliyordu.'},
      {title:'Kumdan suya',illustration:'shore',text:'Önünde bir ayak çukuru vardı. Yavru kenarından dolaştı. Gönüllüler uzaktaki diğer engelleri güvenle düzeltiyordu. Hiç kimse fotoğraf için yavrunun yolunu kesmedi.\n\nİlk dalga kabuğuna dokunduğunda yavru bir an durdu. Sonraki dalgada yüzgeçlerini suya açtı. Kumda bıraktığı küçük iz denizin kıyısında sona erdi.'},
      {title:'Sessiz bir uğurlama',illustration:'night',text:'Gönüllü, kıyıdaki çocuklara “Artık yolculuğu denizde devam ediyor,” dedi. Çocuklar telefon ışıklarını açmadan ufka baktı. Görmek için daha çok ışığa değil, biraz beklemeye ihtiyaçları vardı.\n\nErtesi sabah kumsalı temizlerken küçük bir kaplumbağa izi buldular. Onu bozmadılar. Bazı yolculuklara eşlik etmenin en iyi yolu, yolu açık bırakmaktı.'},
    ],
  },
  {
    id:'karga-altin',title:'Karganın Altın Tanesi',tagline:'Parlayan her şey birine ait olabilir.',category:'animal',artwork:'crow',coverScene:'town',reflection:'Kara’nın parlak düğmeyi geri vermesi neyi değiştirdi?',
    pages:[
      {title:'Güneşte parlayan',illustration:'town',text:'Karga Kara, parkta altın gibi parlayan bir şey buldu. Onu gagasına alıp en yüksek dala çıktı. Bir hazine bulduğundan emindi.\n\nAşağıda terzi dükkânının önünde bir çocuk ağlıyordu. Ceketinin tek düğmesi eksikti. Kara’nın bulduğu nesnenin üzerinde de aynı küçük yıldız çizimi vardı.'},
      {title:'Düğme mi, hazine mi?',illustration:'garden',text:'Kara düğmeyi dala bıraktı. Güzel parlıyordu. Ama çocuğun ceketi açık kalmıştı. Kara bir sağa, bir sola baktı.\n\nSerçe, “Parladığı için senin olmuyor,” diye cıvıldadı. Kara düğmeyi tekrar gagasına aldı. Onu geri bırakmak için kalabalıktan uzak, görülebilecek bir yer aradı.',choices:[{label:'Dükkânın önüne bırak',nextPageIndex:2},{label:'Parktaki banka bırak',nextPageIndex:3}]},
      {title:'Kapıdaki küçük tık',illustration:'town',text:'Kara düğmeyi dükkânın önündeki temiz paspasa bıraktı. Gagasıyla kapıya hafifçe vurdu, sonra uzaklaştı. Terzi kapıyı açınca yıldızlı düğmeyi gördü.\n\nÇocuk düğmesini hemen tanıdı. Kara uzaktaki daldan, terzinin iğne ipliğini hazırlamasını izledi.',nextPageIndex:4},
      {title:'Bankın üzerindeki yıldız',illustration:'garden',text:'Kara düğmeyi çocuğun ailesiyle oturduğu banka bıraktı. Yakındaki dala konup kısa bir ses çıkardı. Çocuk başını çevirince bankta parlayan yıldızı gördü.\n\nDüğmeyi avucuna alıp terziye koştu. Kara, boşalan bankta kalan gölgeyi izledi. Parlak nesne doğru yere dönmüştü.',nextPageIndex:4},
      {title:'Dalın yeni hazinesi',illustration:'forest',text:'Çocuk ceketini ilikledi. Kara’ya uzaktan el salladı. Kara dalında artık düğme olmadığını fark etti. Ama parkın sesleri eskisinden daha sıcak geliyordu.\n\nBir süre sonra yuvaya taşıyacak kuru bir dal buldu. Bu kez onu saklamadan diğer kargalara gösterdi. Her güzel şeyin yeri aynı değildi: Düğme cekete, dal yuvaya yakışıyordu.'},
    ],
  },
];
