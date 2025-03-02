import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';

/**
 * クライアントコンポーネント用のSupabaseクライアント
 * 
 * @supabase/auth-helpers-nextjsのcreateClientComponentClientは
 * .env.localに設定されたNEXT_PUBLIC_SUPABASE_URLと
 * NEXT_PUBLIC_SUPABASE_ANON_KEYを自動的に読み込みます。
 * 
 * このファイルは「クライアントコンポーネント」専用です。
 * サーバーコンポーネントでは使用しないでください。
 */

// クライアントサイド用のSupabaseクライアント
export const createClientSupabase = () => {
    return createClientComponentClient<Database>();
};