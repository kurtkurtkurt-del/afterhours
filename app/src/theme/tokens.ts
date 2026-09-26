// kâğıt üstüne mürekkep. saf beyaz ve saf siyah yok.
export const colors = {
  paper: '#F3F1EC',
  paper2: '#FAF9F6',
  ink: '#0E0D0C',
  ink2: '#6C6961',
  rule: '#D9D5CC',
  spot: '#D7261E',     // kırmızı: canlı · tutulan · açık; dolgu, çerçeve, logodaki nokta
  spotText: '#F0443A', // mürekkep üstünde kırmızı YAZI (spot küçük yazıda okunmuyor)
  ink3: '#2A2724',     // hairline: koyu zeminde ayırıcı çizgi
  mute: '#A9A59C',     // muted: koyu zeminde soluk yazı ve ikon
  meta: '#7F7B73',     // meta: küçük büyük harfli künye satırları
} as const;

export const fonts = {
  regular: 'InterTight_400Regular',
  medium: 'InterTight_500Medium',
  semibold: 'InterTight_600SemiBold',
  jet: 'JetBrainsMono_400Regular',  // künye ayrıntıları: afiş altyazısı, harita kartı (10–11px)
  mono: 'InterTight_400Regular',    // küçük büyük harfli satırlar da aynı fontta; tek aile
  logo: 'ArchivoLogo',              // sadece isim: archivo, genişlik 62, ağırlık 900 (assets/fonts)
} as const;

// açılış zamanlaması, milisaniye. "biraz daha yavaş" dendiğinde burası değişir.
export const intro = {
  hold: 300,       // kâğıt boş dururken bekleme
  photoIn: 1400,   // fotoğrafın belirmesi
  wordDelay: 900,  // ismin belirmeye başladığı an
  word: 800,       // ismin belirme süresi
  leaveAt: 3200,   // sonraki ekrana geçiş
} as const;
