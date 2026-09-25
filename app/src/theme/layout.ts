// isim: introda ortada büyük, sonraki ekranlarda sol üstte küçük
export const brand = {
  bigSize: 30,
  smallSize: 18,
  top: 72,     // küçük halin üst boşluğu
  left: 24,    // küçük halin sol boşluğu
  move: 600,   // ortadan köşeye kayma süresi, ms
  logoBig: 46,   // logo (archivo dar, siyah): introda ortada
  logoSmall: 24, // logo: ana ekranda sol üst köşede
} as const;
