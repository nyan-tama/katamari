import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

/**
 * サーバーコンポーネント用のSupabaseクライアント
 * 
 * このファイルは「サーバーコンポーネント」専用です。
 * クライアントコンポーネントでは使用しないでください。
 */

// サーバーコンポーネント用ヘルパー関数
export const getServerSupabase = () => {
    return createServerComponentClient<Database>({ cookies });
};