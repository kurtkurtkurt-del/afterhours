// kâğıt üstüne mürekkep. saf beyaz ve saf siyah yok.
export const colors = {
  paper: '#F3F1EC',
  paper2: '#FAF9F6',
  ink: '#161512',
  ink2: '#6C6961',
  rule: '#D9D5CC',
  spot: '#2B3ECF',
  mute: '#8A877F',   // koyu zeminde soluk ikon ve yazı
} as const;

export const fonts = {
  regular: 'InterTight_400Regular',
  medium: 'InterTight_500Medium',
  mono: 'JetBrainsMono_400Regular', // küçük satırlar: büyük harf, geniş aralık
} as const;

// açılış zamanlaması, milisaniye. "biraz daha yavaş" dendiğinde burası değişir.
export const intro = {
  hold: 300,       // kâğıt boş dururken bekleme
  photoIn: 1400,   // fotoğrafın belirmesi
  wordDelay: 900,  // ismin belirmeye başladığı an
  word: 800,       // ismin belirme süresi
  leaveAt: 3200,   // sonraki ekrana geçiş
} as const;
