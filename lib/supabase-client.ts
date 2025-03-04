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

// ストレージからの公開URLを取得する関数
export const getPublicUrl = (bucket: string, path: string) => {
    if (!path) return '';

    const supabase = createClientComponentClient<Database>();
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);

    // URLのデバッグ情報をコンソールに出力
    console.log(`Generated URL for ${bucket}/${path}:`, data.publicUrl);

    return data.publicUrl;
};