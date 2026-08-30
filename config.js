/* afterhours — backend configuration.
   These two fields get filled in once a Supabase project exists. While
   they are empty the site behaves exactly as it did before there was a
   backend: the data is read from events-data.js.

   The key below is the "anon" key. It is public on purpose and is not a
   secret. What protects the data is the row-level rules in the database
   (backend/sql/02_rls.sql), not the obscurity of this string. The
   "service_role" key is NEVER written here.  */

window.AH_CONFIG = {
  url: "https://elmnnyxgavwjxvwjgjcu.supabase.co",
  anonKey: "sb_publishable_rrXU52Q7NnESxbEcp-6WfA_612THnnN",
  city: "munchen",
};
