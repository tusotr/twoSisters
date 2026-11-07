// Cloud database settings. Leave both empty to keep saving customers in this
// browser only. To share one customer list between devices, fill both in with
// the values from Supabase → Project Settings → API (see README §0.10).
// The anon key is designed to be public: access is protected by the login and
// the database rules in supabase/schema.sql, not by hiding this key.
window.TS_CONFIG = {
  supabaseUrl: 'https://zjgnzujhnfrksbpwqnln.supabase.co',      // e.g. 'https://abcdefghijkl.supabase.co'
  supabaseAnonKey: 'sb_publishable_RDxd2mTPoiV-FQzN5DfCUA_D_Hceq8B'   // the long "anon public" key
};
