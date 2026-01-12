import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Supabaseが設定されているかどうか
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// 環境変数が設定されていない場合はダミーのクライアントを作成
// 実際のSupabase接続は行わず、UIの確認のみ可能
let supabase: SupabaseClient;

if (isSupabaseConfigured) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
    // ダミーURLでクライアントを作成（実際のリクエストは失敗するがクラッシュしない）
    console.warn(
        '⚠️ Supabase環境変数が設定されていません。デモモードで動作します。\n' +
        '実際のデータ保存には .env.local ファイルに以下を設定してください:\n' +
        'NEXT_PUBLIC_SUPABASE_URL=your-supabase-url\n' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key'
    );
    supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
}

export { supabase };
