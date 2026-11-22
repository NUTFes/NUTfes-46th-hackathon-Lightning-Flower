import { createClient } from "@supabase/supabase-js";

// secret key を使う、サーバー専用のクライアント（Storage の署名付き URL の発行などに使う）。
// RLS を無視して何でもできるので、ブラウザに渡るコードから import しない。
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SECRET_KEY が設定されていません",
    );
  }
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
