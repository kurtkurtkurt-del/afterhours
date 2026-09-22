// kâğıt üstüne mürekkep. saf beyaz ve saf siyah yok.
export const colors = {
  paper: '#F3F1EC',
  paper2: '#FAF9F6',
  ink: '#161512',
  ink2: '#6C6961',
  rule: '#D9D5CC',
  spot: '#2B3ECF',
} as const;

export const fonts = {
  regular: 'InterTight_400Regular',
  medium: 'InterTight_500Medium',
} as const;

// açılış zamanlaması, milisaniye. "biraz daha yavaş" dendiğinde burası değişir.
export const intro = {
  clockIn: 400,       // saatin belirmesi
  spinStart: 500,     // akreple yelkovanın dönmeye başladığı an
  spin: 2600,         // dönüş süresi; hız giderek artar
  turns: 16,          // yelkovanın toplam tur sayısı
  burstAt: 3000,      // saatin toza ayrıldığı an
  dust: 1800,         // tozun yere dökülme süresi
  photoIn: 1500,      // arkadaki fotoğrafın belirmesi
  boxAt: 4500,        // "join now" kutusunun geldiği an
  box: 500,
} as const;
