// First-visit tips (components/Tips.tsx): one per page, short (two were too many, owner, 12.10.2026).
export const tips = {
  'tips.done': { en: 'got it', de: 'verstanden', tr: 'anladım' },
  'tips.reset': { en: 'show the tips again', de: 'tipps wieder zeigen', tr: 'ipuçlarını tekrar göster' },
  'tips.reset.hint': { en: 'the short notes on each page, from the start', de: 'die kurzen hinweise auf jeder seite, von vorn', tr: 'her sayfadaki kısa notlar, baştan' },
  'tips.reset.done': { en: 'they come back on each page.', de: 'sie kommen auf jeder seite wieder.', tr: 'her sayfada yeniden çıkacaklar.' },

  'tips.flow.1.t': { en: 'swipe the nights', de: 'wisch durch die nächte', tr: 'geceleri kaydır' },
  'tips.flow.1.b': { en: 'right keeps a night, left lets it go. up: the ticket, down: the details. + makes your own.', de: 'rechts behalten, links loslassen. hoch: das ticket, runter: die details. + macht deine eigene.', tr: 'sağa sakla, sola geç. yukarı: bilet, aşağı: ayrıntılar. + ile kendi geceni oluştur.' },

  'tips.people.1.t': { en: 'your people', de: 'deine leute', tr: 'insanların' },
  'tips.people.1.b': { en: 'a red ring means out right now. tap a face to see what they keep; a group finds a night together.', de: 'roter ring: gerade unterwegs. tipp auf ein gesicht und sieh, was sie behalten; eine gruppe findet gemeinsam eine nacht.', tr: 'kırmızı halka şu an dışarıda demek. ne sakladığını görmek için yüze dokun; grup birlikte gece bulur.' },

  'tips.yours.1.t': { en: 'with your people', de: 'mit deinen leuten', tr: 'seninkilerle' },
  'tips.yours.1.b': { en: 'the nights your friends kept, and the sparks waiting for your answer. search by name to add people.', de: 'die nächte, die deine freunde behalten haben, und sparks, die auf deine antwort warten. such nach namen, um leute hinzuzufügen.', tr: 'arkadaşlarının sakladığı geceler ve cevabını bekleyen sparklar. insan eklemek için isimle ara.' },

  'tips.map.1.t': { en: 'what is near', de: 'was in der nähe ist', tr: 'yakında ne var' },
  'tips.map.1.b': { en: 'squares are nights, red ones a friend kept, gold diamonds are sparks. tap one.', de: 'quadrate sind nächte, rote hat ein freund behalten, goldene rauten sind sparks. tippen.', tr: 'kareler gece, kırmızılar bir arkadaşın sakladığı, altın elmaslar spark. birine dokun.' },

  'tips.account.1.t': { en: 'your sleeve', de: 'deine hülle', tr: 'senin kapağın' },
  'tips.account.1.b': { en: 'tap the cover to set your photo; edit adds a bio and your links. check in at a night and its card lands here.', de: 'tipp aufs cover für dein foto; bearbeiten fügt bio und links hinzu. check bei einer nacht ein und ihre karte landet hier.', tr: 'fotoğrafın için kapağa dokun; düzenle ile biyografi ve linklerini ekle. bir gecede check-in yap, kartı buraya düşer.' },

  'tips.panel.1.t': { en: 'your panel', de: 'dein panel', tr: 'panelin' },
  'tips.panel.1.b': { en: 'the numbers on top; below them make nights, rooms and djs. nights people sent in wait here until you let them through.', de: 'oben die zahlen; darunter nächte, räume und djs anlegen. eingeschickte nächte warten hier, bis du sie freigibst.', tr: 'üstte sayılar; altında gece, mekan ve dj oluştur. gönderilen geceler sen onaylayana kadar burada bekler.' },

  'tips.night.1.t': { en: 'keep it', de: 'behalt sie', tr: 'sakla' },
  'tips.night.1.b': { en: 'keep tells your friends you might go. talk about the night below; on the night, check in to get its card.', de: 'behalten zeigt deinen freunden, dass du vielleicht hingehst. unten über die nacht reden; am abend einchecken für die karte.', tr: 'saklamak arkadaşlarına gidebileceğini söyler. aşağıda gece hakkında konuş; o gece check-in yap, kartını al.' },

  'tips.spark.1.t': { en: 'one tap', de: 'ein tipp', tr: 'tek dokunuş' },
  'tips.spark.1.b': { en: 'name, time and place are suggested; change any of them below. a wave says who gets it: your friends, theirs, or one step further.', de: 'name, zeit und ort sind vorgeschlagen; unten änderst du sie. eine welle sagt, wer ihn bekommt: deine freunde, ihre, oder einen schritt weiter.', tr: 'isim, saat ve yer önerili; aşağıdan istediğini değiştir. dalga kime gideceğini söyler: arkadaşların, onlarınkiler ya da bir adım ötesi.' },
} as const;
