import type { Story } from '../stories';

export const explorerStory: Story = {
  "id": "minik-kasif",
  "title": "Minik Kaşif ve Harita",
  "tagline": "Kaybolan bir sesin peşinde.",
  "category": "adventure",
  "artwork": "map",
  "coverScene": "forest",
  "reflection": "Mina önce dinlemeseydi hangi ipucunu kaçırabilirdi?",
  "pages": [
    {
      "title": "Yolları olmayan harita",
      "text": "Mina, dedesinin eski ceketini asarken cebinde katlanmış bir kâğıt buldu. Kâğıtta ne sokak adı vardı ne de bir ok. Yalnızca üç küçük çizim: bir yaprak, bir kuş ve bir su damlası.\n\nArka yüzünde dedesinin eğri yazısıyla şöyle yazıyordu: ‘Bazen yolu görmek için önce dinlemek gerekir.’ Mina pencereyi açtı. Bahçedeki yapraklar hışırdadı. Ama her sabah duyduğu derenin şırıltısı yoktu.",
      "illustration": "workshop",
      "nextPageIndex": 1
    },
    {
      "title": "Bahçede eksik olan bir ses",
      "text": "‘Dere bugün neden sessiz?’ diye sordu Mina. Annesi, elindeki sulama kabını bıraktı. ‘Ben de fark ettim. İstersen birlikte bakabiliriz.’ Mina büyütecini çantasına koydu; sonra düşündü ve küçük defterini de aldı.\n\nBahçe kapısında haritanın ilk çizimini gördüler: rüzgârda kıpırdayan kocaman bir yaprak. Mina yere çömeldi. Toprakta iki iz vardı. Biri ıslak çakıllara, diğeri sık sazlıklara gidiyordu. Sazların içinden ince bir ıslık geldi.",
      "illustration": "garden",
      "nextPageIndex": 2
    },
    {
      "title": "Hangi izi takip edelim?",
      "text": "Mina iki yolu da defterine çizdi. Islak çakıllar suyun nereden geldiğini gösterebilirdi. Islık ise yardıma ihtiyacı olan bir canlıdan geliyor olabilirdi.\n\nAnnesi yanına oturdu. ‘İkisine de bakacak zamanımız var. Önce hangi ipucunu incelemek istersin?’ Mina haritayı dizlerine serdi. Bu kez ilk adımı kendisi seçecekti.",
      "illustration": "forest",
      "choices": [
        {
          "label": "Islak çakılları incele",
          "nextPageIndex": 3
        },
        {
          "label": "Islığın geldiği yere bak",
          "nextPageIndex": 4
        }
      ]
    },
    {
      "title": "Su durmamış, saklanmıştı",
      "text": "Çakılların yanında küçük bir su birikintisi vardı. Mina, suyun düşen bir dalın arkasında toplandığını gördü. Dalı tek başına kaldırmaya çalışmadı; annesini çağırdı. Birlikte, kenardaki yaprakları dikkatle çektiler.\n\nDar bir su yolu açılınca şırıltı geri geldi. Sazların içinden bir ördek yavrusu çıktı, sonra ikincisi. İnce ıslık onlardan geliyordu! Mina defterine bir dal çizdi. Altına da ‘Su kaybolmamıştı’ yazdı.",
      "illustration": "forest",
      "nextPageIndex": 5
    },
    {
      "title": "Sazların küçük misafirleri",
      "text": "Mina, sazlara dokunmadan aralarına baktı. İki ördek yavrusu, kuru kalan su yolunun kıyısında bekliyordu. Anneleri öbür taraftan sesleniyordu. ‘Onları korkutmadan yardım edebilir miyiz?’ diye fısıldadı Mina.\n\nAnnesi yolu tıkayan dalı fark etti. Birlikte yaprakları kenara aldılar. Su incecik bir çizgi gibi akmaya başladı. Yavrular suya atlayıp annelerine doğru yüzdü. Mina gülümsedi: Islığın anlamını bulmuştu.",
      "illustration": "garden",
      "nextPageIndex": 5
    },
    {
      "title": "Haritaya eklenen bir çizim",
      "text": "Derenin sesi yeniden bahçeye yayıldı. Mina haritanın boş köşesine iki küçük ördek çizdi. Yaprağın, kuşun ve su damlasının yanına artık kendi keşfi de eklenmişti.\n\nAkşam dedesini aradığında ‘Haritanda hazine yoktu,’ dedi. Dedesi güldü. ‘Peki bugün ne buldun?’ Mina defterine baktı. ‘Bir sesin neden sustuğunu. Bir de her şeyi tek başıma yapmak zorunda olmadığımı.’ Haritayı yeniden katladı. Yarın boş köşelerden birini daha doldurabilirdi.",
      "illustration": "night"
    }
  ]
};
