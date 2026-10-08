import type { Story } from '../stories';

export const learningStories: Story[] = [
  {
    id:'renkli-sehir',title:'Renkli Şehirde Bir Gün',tagline:'Boş bir duvarın istediği şey biraz hayaldi.',category:'education',artwork:'city',coverScene:'town',reflection:'Ece’nin resmine başka biri katılınca nasıl değişti?',
    pages:[
      {title:'Soluk görünen sokak',illustration:'town',text:'Ece’nin mahallesindeki duvar yeni boyanmıştı. Kocaman, bomboş ve griydi. Ece yanından geçerken defterine bir sarı daire çizdi. Duvara da bir güneş yakışacağını düşündü.\n\nMahalle atölyesinde görevli öğretmene fikrini anlattı. Duvarın sahibiyle konuşuldu. İzin alınca çocuklar için ortak bir resim günü düzenlendi.'},
      {title:'İlk fırça',illustration:'workshop',text:'Ece duvarın kendine ayrılan kısmına sarı bir güneş çizdi. Yanına mavi bir dere eklemek istedi, ama fırçasında sarı boya kalmıştı. İki renk karışınca yeşil bir çizgi oluştu.\n\n“Yanlış oldu!” dedi. Yanındaki çocuk çizgiye baktı. “Bence bu bir çimen olabilir.” Ece durup yeniden baktı. Resim planından farklıydı; ama kaybolmamıştı.'},
      {title:'Bir fikrin yanındaki fikir',illustration:'town',text:'Yeşil çizginin yanına bir ağaç geldi. Bir çocuk kuş, başka biri bisiklet çizdi. Ece resmin hepsini kendi hayal ettiği gibi yapmak istiyordu.\n\nÖğretmen, “Herkesin fikrine yer açabilir miyiz?” diye sordu. Ece güneşi biraz yukarı taşıdı. Altta yeni bir yol açıldı. Bisiklet, ağacın gölgesinden geçebiliyordu.'},
      {title:'Mahallenin yeni penceresi',illustration:'town',text:'Akşam boya kurudu. Duvar tek bir çocuğun resmi değildi; yan yana gelen birçok küçük hayaldi. Ece kendi güneşini buldu, sonra onu hiç düşünmediği kuşun yanında gördü.\n\n“Ben böyle çizmemiştim,” dedi annesine. “Ama şimdi daha çok şey anlatıyor.” Eve giderken duvarın fotoğrafını değil, yanındaki arkadaşlarının resmini defterine çizdi.'},
    ],
  },
  {
    id:'yildiz-robot',title:'Yıldız Robot Riko',tagline:'Bir robot, dinlemeyi öğreniyor.',category:'education',artwork:'robot',coverScene:'workshop',reflection:'Riko yardım etmeden önce neden Neva’nın ne istediğini sordu?',
    pages:[
      {title:'Görev listesindeki boşluk',illustration:'workshop',text:'Riko sabah vidalarını, lambalarını ve pilini kontrol etti. Her şey çalışıyordu. Ama görev listesindeki “Bir arkadaşına yardım et” satırının yanında nasıl yapılacağı yazmıyordu.\n\nParkta Neva’yı gördü. Neva yaptığı kâğıt uçağı dizlerine koymuş, sessizce oturuyordu. Riko hemen en hızlı uçağı yapmak için hesaplamaya başladı.'},
      {title:'Yanlış yardım',illustration:'garden',text:'Riko yeni bir uçak katlayıp Neva’ya uzattı. Neva başını salladı. “Yeni bir uçak istemiyorum. Dedemle yaptığım bu uçağın kanadı yırtıldı.”\n\nRiko’nun ışığı kısa bir an söndü. Sorunun uçuş uzaklığı olmadığını anlamıştı. “Uçağını tamir etmeyi mi, yoksa biraz yanında oturmamı mı istersin?” diye sordu.',choices:[{label:'Önce birlikte dinle',nextPageIndex:2},{label:'İzin alıp uçağı onar',nextPageIndex:3}]},
      {title:'Sözünü kesmeden',illustration:'garden',text:'Neva dedesiyle uçağı nasıl yaptıklarını anlattı. Riko sözünü kesmeden dinledi. Dedesi kanada küçük bir yıldız çizmişti. Neva o yıldızın kaybolmasını istemiyordu.\n\nRiko yıldızın üzerinden geçmeyen küçük bir onarım önerdi. Neva gülümsedi. Tamiri şimdi birlikte yapabilirlerdi.',nextPageIndex:4},
      {title:'Yıldızı koruyan yama',illustration:'workshop',text:'Riko, “Bu kısmı tutabilir miyim?” diye sordu. Neva izin verince kanadı masaya yatırdılar. Küçük bir kâğıt parçasıyla yırtığı kapattılar. Yıldız hâlâ görünüyordu.\n\nNeva eski uçağını eline aldı. “Yeni gibi olmadı,” dedi. “Ama hâlâ benim uçağım.” Riko bunu görev defterine eklemek istedi.',nextPageIndex:4},
      {title:'Listede yeni bir satır',illustration:'night',text:'Uçak kısa bir tur atıp çimlere indi. Neva onu alırken artık gülümsüyordu. Riko, görev listesindeki boşluğa “Önce sor, sonra dinle” yazdı.\n\nYardım bazen bir şeyi değiştirmekti, bazen yalnızca yanında durmak. Ertesi gün Riko’nun lambaları yine kontrol edilecekti. Dinleme görevi ise her arkadaş için yeniden başlayacaktı.'},
    ],
  },
  {
    id:'minik-sef',title:'Minik Şefin Tarifi',tagline:'Bir tarifteki en önemli ölçü dikkat.',category:'education',artwork:'fruit',coverScene:'kitchen',reflection:'Lina tarifte bir şeyi değiştirince sonucu nasıl takip etti?',
    pages:[
      {title:'Önlük biraz büyüktü',illustration:'kitchen',text:'Lina önlüğünün ipini iki kez doladı. Bugün babasıyla meyveli yoğurt hazırlayacaktı. Masada yıkanmış meyveler, bir kase yoğurt ve küçük bir tarif defteri vardı.\n\nBıçakla kesme işini babası yapacaktı. Lina ölçüleri okuyacak, meyveleri kaseye koyacak ve karıştıracaktı. Defterin ilk satırına kendi adını yazdı.'},
      {title:'Taşan kaşık',illustration:'kitchen',text:'Lina meyvelerin hepsini aynı anda ekledi. Kase doldu, bir çilek masaya yuvarlandı. “Tarif bozuldu,” diye içini çekti.\n\nBabası daha büyük bir kase getirdi. “Ölçüleri yeniden düşünelim.” Lina tarifteki iki kişilik miktarı okuyup masadaki dört kişiyi saydı. Sorun kendisi değil, hazırladığı kabın küçüklüğüydü.'},
      {title:'Bir küçük deneme',illustration:'workshop',text:'Lina bir kaşık karışımı küçük bir tabağa ayırdı. “Önce tadına bakalım,” dedi. Meyve miktarı yeterliydi. Daha fazla bir şey eklemek istemedi.\n\nDefterine büyük kase resmini çizdi. Yanına “Dört kişi için” yazdı. Babası, “Bir sonraki sefer neyi hatırlayacaksın?” diye sordu. Lina kalemiyle kaseyi gösterdi.'},
      {title:'Tarifin altındaki not',illustration:'kitchen',text:'Herkes masaya geldiğinde Lina kaseleri sırayla dağıttı. Önce herkesin aynı malzemeleri yiyip yiyemediğini bir yetişkinle kontrol etmişlerdi. Her tabağı sahibine göre hazırladılar.\n\nLina tarifini okudu. En altta küçük bir not vardı: “Yardım istemek de tarifin bir parçası.” Yarın yine şef olabilirdi; her şeyi tek başına yapmasına gerek yoktu.'},
    ],
  },
  {
    id:'sayi-kahramanlari',title:'Sayı Kahramanları',tagline:'Piknikte eksik olan bir bardak.',category:'education',artwork:'numbers',coverScene:'garden',reflection:'Baran toplamı unuttuğunda saymaya nasıl yeniden başladı?',
    pages:[
      {title:'Kaç kişi gelecekti?',illustration:'garden',text:'Baran sınıf pikniğinin hazırlığına yardım ediyordu. Listede altı çocuk ve iki yetişkin vardı. Masaya altı bardak koydu. Öğretmeni listeyi yeniden okumasını istedi.\n\nBaran altı ve iki için parmakları yerine sekiz küçük taş kullandı. Taşları yan yana dizince eksik iki bardak hemen belli oldu.'},
      {title:'Karışan sıra',illustration:'workshop',text:'Rüzgâr listeyi çevirdi. Baran bardakları sayarken bir arkadaşına cevap verdi ve nerede kaldığını unuttu. Baştan sayarken de aynı bardağa iki kez dokundu.\n\nSonra saydığı bardağı masanın öbür tarafına taşımayı denedi. Her taşla bir bardağı eşleştirdi. Bu kez hiçbir bardak iki kez sayılmadı.'},
      {title:'Yeni iki misafir',illustration:'garden',text:'Pikniğe iki çocuk daha katılınca Baran paniklemedi. Sekiz taşın yanına iki taş ekledi. Toplam on kişi olmuştu. Kutuda iki bardak daha vardı.\n\n“Bütün sayılar değişti!” dedi bir arkadaşı. Baran masayı gösterdi. “Ama önceki sekizi kaybetmedik. Yalnızca iki ekledik.” Masada herkese bir yer açıldı.'},
      {title:'Taşların anlattığı',illustration:'garden',text:'Yemek bitince Baran taşları topladı. Bardakların artık insanları saymak için değil, su içmek için masada kaldığını düşündü.\n\nÖğretmeni nasıl çözdüğünü sorunca “Taşlar bana hangi bardağı saydığımı gösterdi,” dedi. Büyük sayılara yetişmek için hızlı konuşması gerekmemişti. Eşleştirmek ve yavaşça kontrol etmek yetmişti.'},
    ],
  },
  {
    id:'renk-carsisi',title:'Renk Çarşısı',tagline:'Yeşili ararken bulunan yeni tonlar.',category:'education',artwork:'palette',coverScene:'workshop',reflection:'Bir rengi denerken az boya kullanmak neden işe yaradı?',
    pages:[
      {title:'Boş kalan ağaç',illustration:'workshop',text:'İdil çarşıdaki resim atölyesinde bir bahçe çiziyordu. Ağacın gövdesi hazırdı; yaprakları için yeşil boya aradı. Küçük tüp boşalmıştı.\n\n“Resmim yarım kalacak,” dedi. Atölyedeki usta sarı ve mavi boyayı gösterdi. “Bunlarla küçük bir deneme yapmak ister misin?” İdil boş bir kâğıt parçası aldı.'},
      {title:'İki rengin karşılaşması',illustration:'workshop',text:'İdil kâğıda biraz sarı, yanına biraz mavi koydu. Fırçayla karıştırınca yeşil bir iz belirdi. Tüpte aradığı rengin aynısı değildi, ama yapraklara yakışabilirdi.\n\nDaha açık mı, daha koyu mu olacağını merak etti. Bütün resmi boyamadan önce iki küçük deneme alanı hazırladı.',choices:[{label:'Biraz daha sarı ekle',nextPageIndex:2},{label:'Biraz daha mavi ekle',nextPageIndex:3}]},
      {title:'Güneş gören yaprak',illustration:'garden',text:'Sarı arttıkça yeşil daha açık göründü. İdil deneme kâğıdını ağacın yanına tuttu. Güneş gören yapraklar için güzel bir tondu.\n\nBoya kuruyunca altına nasıl karıştırdığını yazdı. Artık bu rengi yeniden yapmak istediğinde tahmin etmesi gerekmeyecekti.',nextPageIndex:4},
      {title:'Gölgede duran yaprak',illustration:'forest',text:'Mavi arttıkça yeşil daha koyu göründü. İdil deneme kâğıdını ağacın yanına tuttu. Dalların altında kalan yapraklar için güzel bir tondu.\n\nBoya kuruyunca altına nasıl karıştırdığını yazdı. Artık bu rengi yeniden yapmak istediğinde tahmin etmesi gerekmeyecekti.',nextPageIndex:4},
      {title:'Tek bir yeşil yoktu',illustration:'garden',text:'İdil ağacına hem açık hem koyu yapraklar ekledi. Boş tüpü yanına koyup gülümsedi. Resmi yarım kalmamıştı; düşündüğünden daha fazla renk bulmuştu.\n\nAtölyeden çıkarken deneme kâğıdını da aldı. Çarşının en değerli alışverişi buydu: Yeni bir tonu nasıl bulduğunu gösteren, üzerinde küçük boya izleri olan bir kâğıt.'},
    ],
  },
  {
    id:'sayi-hayvanlari',title:'Sayı Hayvanları',tagline:'Gölette sayılar yer değiştiriyor.',category:'education',artwork:'fish',coverScene:'garden',reflection:'Hayvanlar yer değiştirince sayı değişmek zorunda mı?',
    pages:[
      {title:'Üç balık, iki taş',illustration:'shore',text:'Nil, park görevlisi olan dedesiyle küçük göleti izliyordu. Üç balık suyun yüzeyine yaklaştı. Nil defterine üç nokta çizdi. Sonra iki balık sazların arkasına geçti.\n\n“Şimdi bir balık mı var?” diye sordu. Dedesi suyu gösterdi. “Birini görüyoruz. Ötekiler yalnızca başka yere yüzdü.” Nil noktaları silmedi.'},
      {title:'Kuşlar yer değiştirdi',illustration:'garden',text:'Bir dalda dört kuş vardı. İkisi yan dala uçtu. Nil ilk dalda iki, öteki dalda iki kuş saydı. Defterindeki dört noktayı iki küçük gruba ayırdı.\n\n“Toplam aynı kaldı,” dedi. Tam o sırada başka bir kuş geldi. Nil beşinci noktayı ekledi. Bu kez yalnızca yer değil, toplam da değişmişti.'},
      {title:'Birer birer',illustration:'forest',text:'Kuşlar hızlı kıpırdayınca saymak zorlaştı. Nil dedesinin fotoğrafına baktı; görüntüde herkes aynı yerde duruyordu. Kuşları birer birer işaret etti.\n\nSırayı değiştirip yeniden saydı. Yine beş buldu. Noktalara isim verdi: dalın ucundaki, yaprağın arkasındaki, yan yana duran iki kuş ve aşağıdaki küçük kuş.'},
      {title:'Defterdeki gölet',illustration:'workshop',text:'Eve geldiğinde Nil göleti çizdi. Üç balığı farklı köşelere yerleştirdi. Beş kuşun ikisini uçarken gösterdi. Sonra dedesine resmini saydırdı.\n\nDedesi hepsini bulunca Nil güldü. “Saklandıkları yeri biliyorum!” Noktalar artık yalnızca sayılar değildi. Hareket eden, yer değiştiren bir parkın küçük hatıralarıydı.'},
    ],
  },
];
