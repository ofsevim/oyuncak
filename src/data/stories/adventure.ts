import type { Story } from '../stories';
import { explorerStory } from './explorer';

export const adventureStories: Story[] = [explorerStory,
  {
    id:'korsan-adasi',title:'Korsan Adasının Sırrı',tagline:'Bir sandık, bir melodi, beklenmedik bir hazine.',category:'adventure',artwork:'sailboat',coverScene:'shore',reflection:'Ela sandığı hemen açmak yerine neden önce işaretleri inceledi?',
    pages:[
      {title:'Rüzgârın getirdiği şişe',illustration:'shore',text:'Ela, kaptan olan teyzesiyle küçük yelkenliyi temizliyordu. Dalgalar kıyıya bir şişe bıraktı. İçindeki kâğıtta bir ada ve üç nota çizilmişti. “Bu bir hazine haritası olabilir!” dedi Ela.\n\nTeyzesi hava raporunu kontrol etti. Ertesi sabah birlikte yola çıkabileceklerini söyledi. Ela yanında boş bir sandık götürmek istedi. Hazine büyük olabilirdi.'},
      {title:'Şarkı söyleyen taşlar',illustration:'shore',text:'Adanın kumsalında üç oyuk taş buldular. Rüzgâr içlerinden geçerken farklı sesler çıkarıyordu. Ela kâğıttaki notaları mırıldandı. Bir ses eksikti.\n\nBir papağan, incir ağacından onları izliyordu. “Son notayı biliyor musun?” diye sordu Ela. Papağan başını yana eğdi ve kısa bir ıslık çaldı. Sonra ormana doğru uçtu.',choices:[{label:'Papağanın izini sür',nextPageIndex:2},{label:'Taşların arkasını incele',nextPageIndex:3}]},
      {title:'İncir ağacının altı',illustration:'forest',text:'Ela ve teyzesi papağanı uzaktan takip etti. Kuş, incir ağacının dibindeki ahşap kutuya kondu. Kutunun kapağında da üç nota vardı.\n\nEla taşlardan duyduğu iki sesi, ardından papağanın ıslığını çaldı. Kutudan bir tık sesi geldi. “Şifre bir sayı değilmiş,” dedi teyzesi. “Bir şarkıymış!”',nextPageIndex:4},
      {title:'Kumdaki işaret',illustration:'shore',text:'Ela taşı kaldırmadı; arkasına eğilip baktı. Kumun üzerinde kuş ayaklarına benzeyen izler vardı. İzler, incir ağacının altındaki kutuya uzanıyordu.\n\nKutunun kapağında üç nota çizilmişti. Ela iki taşın sesini hatırladı. Ağaçtaki papağan son notayı ıslıkla tamamladı. Kutu usulca açıldı.',nextPageIndex:4},
      {title:'Boş sandık artık boş değildi',illustration:'shore',text:'Kutuda altın yerine eski bir seyir defteri ve bir avuç tohum vardı. İlk sayfada “Bu adaya uğrayan herkes bir ağaç dikti” yazıyordu. Ela teyzesiyle uygun bir yere iki tohum ekti.\n\nDönüşte kendi sandığına haritayı ve papağan resmini koydu. “Hazineyi bulduk mu?” diye sordu teyzesi. Ela sandığı kapattı. “Bulduk. Ama bir kısmını adada bıraktık.”'},
    ],
  },
  {
    id:'uzay-yolculugu',title:'Uzay Yolculuğu',tagline:'Roketin sustuğu yerde bir fikir doğar.',category:'adventure',artwork:'rocket',coverScene:'space',reflection:'Can sorunu anlamadan düğmelere bassaydı ne olabilirdi?',
    pages:[
      {title:'Mavi bilye',illustration:'space',text:'Can, hayalindeki uzay gemisinin penceresine burnunu yaklaştırdı. Dünya aşağıda mavi bir bilye gibi parlıyordu. Yanındaki görev robotu, “Ay gözlemine üç dakika,” dedi.\n\nCan günlüğüne ilk cümlesini yazdı: “Uzaktan bakınca evimizin ne kadar küçük olduğunu gördüm.” Tam o sırada Dünya ile konuştuğu hoparlör sustu.'},
      {title:'Sessiz anten',illustration:'space',text:'Ekranda bir uyarı yanıyordu: Anten sinyali zayıf. Can telaşla elini düğmelere uzattı, sonra durdu. Kontrol defterinin ilk maddesini okudu: “Önce ne olduğunu araştır.”\n\nRobot dış kamerayı açtı. Antenin üzerinde ince bir buz tabakası vardı. Gemi çalışıyordu; yalnızca anten, güneş görmeyen tarafta soğumuştu.'},
      {title:'Yavaş bir dönüş',illustration:'space',text:'Can görev ekibinin öğrettiği sırayla gemiyi döndürdü. Güneş antene vurunca buz yavaşça çözülmeye başladı. Beklemek, bir düğmeye basmaktan daha zor geldi.\n\n“Bu sırada Ay’ın gölgelerini çizebiliriz,” dedi robot. Can uzun çizgileri defterine aktardı. Birkaç dakika sonra hoparlörden tanıdık bir çıtırtı duyuldu.'},
      {title:'Duyuyor musun?',illustration:'space',text:'“Can, bizi duyuyor musun?” Can gülerek el salladı. “Duyuyorum! Antenin neden sustuğunu da bulduk.” Dünya’daki ekip gözlem çizimlerini istedi.\n\nCan defterini kameraya tuttu. Sorunu çözerken yeni bir şey de keşfetmişti: Ay’daki gölgeler Güneş’in konumuyla değişiyordu. Günlüğüne “Bazen beklerken de ilerlersin” yazdı.'},
      {title:'Penceredeki gökyüzü',illustration:'night',text:'Hayal yolculuğu bittiğinde Can odasındaki pencereye baktı. Ay hâlâ oradaydı. Defterini kapatmak yerine son sayfaya yeni bir soru yazdı: “Ay’ın aynı yüzünü neden görüyoruz?”\n\nYarın bir yetişkinle birlikte bunu araştıracaktı. Şimdilik karton roketinin antenini düzeltti. Küçük bir sorun, kocaman bir sorunun kapısını açmıştı.'},
    ],
  },
  {
    id:'denizalti-macerasi',title:'Denizaltı Macerası',tagline:'Mercan bahçesinde kaybolan renk.',category:'adventure',artwork:'submarine',coverScene:'shore',reflection:'Deniz, denizde gördüklerine neden dokunmadan yardım etti?',
    pages:[
      {title:'Camın öteki tarafı',illustration:'shore',text:'Deniz, deniz bilimci annesiyle araştırma denizaltısına bindi. Camın önünden gümüş balıklar geçti. Deniz gördüğü her rengin adını yazıyordu.\n\nMercanların üzerinde karanlık bir leke fark etti. “Bu kısım neden renksiz?” diye sordu. Annesi lambayı çevirdi. Mercanların üstüne eski bir ağ dolanmıştı.'},
      {title:'Bahçenin kapısı',illustration:'shore',text:'Ağın yanında küçük bir kaplumbağa dönüp duruyordu. Deniz onu hemen dışarı çıkıp kurtarmak istedi. Annesi, “Bu iş için eğitimli dalgıçları çağırmalıyız,” dedi.\n\nDeniz koordinatları okudu, annesi ekibe haber verdi. Ağın yerini kamerayla kaydettiler. Aceleyle dokunmak başka canlılara zarar verebilirdi.'},
      {title:'Sabırla açılan yol',illustration:'shore',text:'Dalgıçlar geldiğinde denizaltı güvenli bir mesafede bekledi. Ağ küçük parçalara ayrılarak toplandı. Kaplumbağanın geçebileceği boşluk açılınca hayvan uzaklaştı.\n\nDeniz kaplumbağanın peşinden gitmedi. Kamerasını tekrar mercanlara çevirdi. Karanlık lekenin altında turuncu, mor ve pembe renkler saklanıyordu.'},
      {title:'Defterdeki son renk',illustration:'night',text:'Yüzeye çıktıklarında güneş suyun üstünde ince bir yol çizmişti. Deniz renk listesinin altına “şeffaf” yazdı. Annesi merakla baktı.\n\n“Cam sayesinde yakından gördüm,” dedi Deniz. “Ama canlıların evine girmeden de yardım edebildim.” Okulda ağın fotoğrafını ve temizlenen mercan bahçesini yan yana gösterecekti.'},
    ],
  },
  {
    id:'kayip-peri-bahcesi',title:'Kayıp Peri Bahçesi',tagline:'Bir kapıyı açmak için bazen onu onarmak gerekir.',category:'adventure',artwork:'flower',coverScene:'garden',reflection:'Duru bahçenin kapısını zorlasaydı neyi gözden kaçırırdı?',
    pages:[
      {title:'Duvarın ardındaki ışık',illustration:'garden',text:'Duru, büyükannesinin bahçesinde kırık bir saksıyı toplarken duvarda minicik bir kapı gördü. Altından yeşil ışık sızıyordu. İçeriden “Biraz yardım!” diye ince bir ses geldi.\n\nDuru yere oturdu. Kapı kolu bir ceviz kabuğuydu. Çevirdi, ama kapı açılmadı. Menteşesine kuru bir sarmaşık dolanmıştı.'},
      {title:'Kapıdaki düğüm',illustration:'garden',text:'Büyükannesi yanına geldi. Birlikte kuru sarmaşığı dikkatle ayırdılar. Kapı açıldı. İçerideki peri, “Çiçeklerin su yolu tıkandı,” dedi.\n\n“Herkes sihir bekliyor, ama bugün birkaç dikkatli ele ihtiyacımız var.” Duru elindeki küçük küreği gösterdi. Peri başını salladı: “Önce suyun nereye takıldığını bulalım.”'},
      {title:'Küçük bahçıvanlar',illustration:'forest',text:'Duru yapraklardan yapılmış kanalı izledi. Bir yerde taş, suyun önünü kesiyordu. Periler taşın çevresine toplandı. Duru taşı tek başına almak yerine nasıl yardım edebileceğini sordu.\n\nBirlikte taşın yanından yeni bir yol açtılar. Su damlaları çiçeklere ulaştı. Bahçe bir anda değil, çiçek çiçek canlandı.'},
      {title:'Açık kalan kapı',illustration:'night',text:'Peri Duru’ya parlak bir çiçek uzattı. Duru başını salladı. “Burada daha güzel,” dedi. Bunun yerine bahçenin resmini çizmek için izin istedi.\n\nEve dönünce duvarın dibindeki toprağı suladı. Artık kapının yerini biliyordu. Küçük bir bahçede bile herkesin yapabileceği bir iş vardı.'},
    ],
  },
  {
    id:'gokkusagi-hazine',title:'Gökkuşağı Hazinesi',tagline:'Yağmurdan sonra başlayan renk avı.',category:'adventure',artwork:'rainbow',coverScene:'garden',reflection:'Ada’nın hazinesi topladığı nesneler yerine başka ne olabilir?',
    pages:[
      {title:'Bir uçtan ötekine',illustration:'garden',text:'Yağmur dindiğinde Ada ve ağabeyi balkona çıktı. Gökyüzünde kocaman bir gökkuşağı vardı. Ada, “Sonunda bir hazine olmalı!” dedi.\n\nAğabeyi boş bir defter getirdi. “Gökkuşağını yakalayamayız. Ama renklerini bugün nerelerde gördüğümüzü bulabiliriz.” İlk sayfaya yedi boş daire çizdiler.'},
      {title:'Kırmızı bir başlangıç',illustration:'town',text:'Mahalledeki manavın kırmızı elmaları ilk daireyi doldurdu. Sarı için bir limon çizdiler. Sonra Ada mavi bir kapıyı fark etti.\n\n“Bunlar hazine değil ki,” dedi. Manav deftere baktı. “Bu kapıyı her gün görüyorum, ama bugün senin resminde ilk kez dikkat ettim.” Ada bir sonraki rengi daha yavaş aradı.'},
      {title:'Eksik renk',illustration:'garden',text:'Defterin altı dairesi dolmuştu. Moru bulamamışlardı. Ada koşarak her yere bakmak istedi; ağabeyi parktaki banka oturdu.\n\nAda da oturunca bankın arkasında minicik mor çiçekler gördü. Üstlerinde bir arı dolaşıyordu. Çiçeği koparmadı. Defterine bir çiçek ve bir arı çizdi.'},
      {title:'Defterin içindeki gökkuşağı',illustration:'night',text:'Eve geldiklerinde gökkuşağı çoktan kaybolmuştu. Ada defteri açtı. Elmalar, limon, kapı ve küçük çiçek hâlâ oradaydı.\n\n“Sonunu bulamadık,” dedi ağabeyi. Ada yedi renkli daireyi gösterdi. “Ama hazinemiz burada.” Ertesi yağmurda aynı renkler için başka resimler bulabilirlerdi. Mahalle düşündüğünden daha büyük bir maceraydı.'},
    ],
  },
];
