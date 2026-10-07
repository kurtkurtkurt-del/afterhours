// First-visit tips (components/Tips.tsx): at most two per page, short.
export const tips = {
  'tips.next': { en: 'next', de: 'weiter', tr: 'ileri' },
  'tips.done': { en: 'got it', de: 'verstanden', tr: 'anladım' },
  'tips.skip': { en: 'skip', de: 'überspringen', tr: 'geç' },
  'tips.reset': { en: 'show the tips again', de: 'tipps wieder zeigen', tr: 'ipuçlarını tekrar göster' },
  'tips.reset.hint': { en: 'the short notes on each page, from the start', de: 'die kurzen hinweise auf jeder seite, von vorn', tr: 'her sayfadaki kısa notlar, baştan' },
  'tips.reset.done': { en: 'they come back on each page.', de: 'sie kommen auf jeder seite wieder.', tr: 'her sayfada yeniden çıkacaklar.' },

  'tips.flow.1.t': { en: 'swipe the nights', de: 'wisch durch die nächte', tr: 'geceleri kaydır' },
  'tips.flow.1.b': { en: 'right keeps a night, left lets it go. up: the ticket, down: the details.', de: 'rechts behalten, links loslassen. hoch: das ticket, runter: die details.', tr: 'sağa sakla, sola geç. yukarı: bilet, aşağı: ayrıntılar.' },
  'tips.flow.2.t': { en: 'make your own', de: 'mach deine eigene', tr: 'kendi geceni yap' },
  'tips.flow.2.b': { en: 'tickets are nights out; sparks are nights among friends. + makes your own.', de: 'tickets sind nächte draußen; sparks nächte unter freunden. + macht deine eigene.', tr: 'biletler dışarıdaki geceler; sparklar arkadaşlar arası. + ile kendi geceni oluştur.' },

  'tips.djs.1.t': { en: 'who plays tonight', de: 'wer heute spielt', tr: 'bu gece kim çalıyor' },
  'tips.djs.1.b': { en: 'a red ring is a new story, live means on right now. tap one to listen.', de: 'roter ring: neue story, live: gerade dran. tippen zum reinhören.', tr: 'kırmızı halka yeni hikaye, live şu an çalıyor demek. dinlemek için dokun.' },
  'tips.djs.2.t': { en: 'follow', de: 'folgen', tr: 'takip et' },
  'tips.djs.2.b': { en: 'follow a dj and their stories come first; you hear when they play.', de: 'folg einem dj und seine stories kommen zuerst; du erfährst, wann er spielt.', tr: 'bir dj’i takip et, hikayeleri önce gelsin; ne zaman çaldığını duy.' },

  'tips.yours.1.t': { en: 'with your people', de: 'mit deinen leuten', tr: 'seninkilerle' },
  'tips.yours.1.b': { en: 'the nights your friends kept, and the sparks waiting for your answer.', de: 'die nächte, die deine freunde behalten haben, und sparks, die auf deine antwort warten.', tr: 'arkadaşlarının sakladığı geceler ve cevabını bekleyen sparklar.' },
  'tips.yours.2.t': { en: 'find your people', de: 'finde deine leute', tr: 'seninkileri bul' },
  'tips.yours.2.b': { en: 'search by name or handle; once they accept you see what they keep.', de: 'such nach name oder handle; sobald sie annehmen, siehst du, was sie behalten.', tr: 'isim ya da kullanıcı adıyla ara; kabul edince ne sakladıklarını görürsün.' },

  'tips.map.1.t': { en: 'what is near', de: 'was in der nähe ist', tr: 'yakında ne var' },
  'tips.map.1.b': { en: 'squares are nights, red ones a friend kept, gold diamonds are sparks. tap one.', de: 'quadrate sind nächte, rote hat ein freund behalten, goldene rauten sind sparks. tippen.', tr: 'kareler gece, kırmızılar bir arkadaşın sakladığı, altın elmaslar spark. birine dokun.' },

  'tips.account.1.t': { en: 'your sleeve', de: 'deine hülle', tr: 'senin kapağın' },
  'tips.account.1.b': { en: 'tap the cover to set your photo; edit adds a bio and your links.', de: 'tipp aufs cover für dein foto; bearbeiten fügt bio und links hinzu.', tr: 'fotoğrafın için kapağa dokun; düzenle ile biyografi ve linklerini ekle.' },
  'tips.account.2.t': { en: 'your collection', de: 'deine sammlung', tr: 'koleksiyonun' },
  'tips.account.2.b': { en: 'check in at a night and its card lands here. settings sit at the top.', de: 'check bei einer nacht ein und ihre karte landet hier. einstellungen oben.', tr: 'bir gecede check-in yap, kartı buraya düşer. ayarlar üstte.' },

  'tips.panel.1.t': { en: 'your panel', de: 'dein panel', tr: 'panelin' },
  'tips.panel.1.b': { en: 'the numbers on top; below them make nights, rooms and djs.', de: 'oben die zahlen; darunter nächte, räume und djs anlegen.', tr: 'üstte sayılar; altında gece, mekan ve dj oluştur.' },
  'tips.panel.2.t': { en: 'sent in', de: 'eingeschickt', tr: 'gönderilenler' },
  'tips.panel.2.b': { en: 'nights people sent in wait here until you let them through.', de: 'eingeschickte nächte warten hier, bis du sie freigibst.', tr: 'kullanıcıların gönderdiği geceler sen onaylayana kadar burada bekler.' },

  'tips.night.1.t': { en: 'keep it', de: 'behalt sie', tr: 'sakla' },
  'tips.night.1.b': { en: 'keep tells your friends you might go. the ticket button leaves for the seller.', de: 'behalten zeigt deinen freunden, dass du vielleicht hingehst. ticket führt zum verkäufer.', tr: 'saklamak arkadaşlarına gidebileceğini söyler. bilet düğmesi satıcıya götürür.' },
  'tips.night.2.t': { en: 'beforehours', de: 'beforehours', tr: 'beforehours' },
  'tips.night.2.b': { en: 'talk about the night below; on the night, check in to get its card.', de: 'unten über die nacht reden; am abend einchecken für die karte.', tr: 'aşağıda gece hakkında konuş; o gece check-in yap, kartını al.' },

  'tips.spark.1.t': { en: 'one tap', de: 'ein tipp', tr: 'tek dokunuş' },
  'tips.spark.1.b': { en: 'name, time and place are suggested; change any of them below.', de: 'name, zeit und ort sind vorgeschlagen; unten änderst du sie.', tr: 'isim, saat ve yer önerili; aşağıdan istediğini değiştir.' },
  'tips.spark.2.t': { en: 'who gets it', de: 'wer ihn bekommt', tr: 'kime gider' },
  'tips.spark.2.b': { en: 'a wave: your friends, their friends too, or one step further.', de: 'eine welle: deine freunde, ihre freunde, oder noch einen schritt weiter.', tr: 'bir dalga: arkadaşların, onların arkadaşları ya da bir adım ötesi.' },
} as const;
