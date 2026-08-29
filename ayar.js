/* afterhours — backend ayari.
   Supabase projesi acilinca bu iki alan doldurulacak. Bos oldugu surece
   site eskisi gibi calisir: veriyi events-data.js'ten okur.

   Buradaki anahtar "anon" anahtaridir; herkese aciktir, gizli degildir.
   Guvenlik veritabanindaki kurallarla saglanir (backend/sql/02_rls.sql).
   Gizli olan "service_role" anahtari BURAYA ASLA YAZILMAZ.  */

window.AH_AYAR = {
  url: "",       // ornek: https://xxxxxxxx.supabase.co
  anonKey: "",   // ornek: eyJhbGciOi...
  sehir: "munchen",
};
