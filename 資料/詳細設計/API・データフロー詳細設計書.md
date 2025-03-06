# API・データフロー詳細設計書

## 1. API概要

「カタマリ」のAPIは、以下の2つの主要コンポーネントで構成されています：

1. **Next.js API Routes**: フロントエンドからのリクエストを処理するAPIエンドポイント
2. **Supabase API**: データベースやストレージへの直接アクセスを提供するAPI

認証や基本的なCRUD操作はSupabase APIを使用し、カスタムロジックが必要な操作にはNext.js API Routesを使用しています。

### 1.1 API設計原則

- RESTful原則に従ったエンドポイント設計
- JSON形式でのデータ交換
- JWT（JSON Web Token）を用いた認証
- 適切なHTTPステータスコードとエラーメッセージの使用
- レート制限とキャッシュの実装

### 1.2 APIエンドポイント一覧

| エンドポイント | メソッド | 説明 | 認証 | 実装状況 |
| --- | --- | --- | --- | --- |
| `/api/auth/session` | GET | ユーザーセッション情報の取得 | 任意 | ✅ 実装済み |
| `/api/models` | GET | モデル一覧の取得 | 不要 | ✅ 実装済み |
| `/api/models/[id]` | GET | 特定モデルの詳細情報取得 | 不要 | ✅ 実装済み |
| `/api/models` | POST | 新規モデルの作成 | 必須 | ✅ 実装済み |
| `/api/models/[id]` | PUT | モデル情報の更新 | 必須 | ✅ 実装済み |
| `/api/models/[id]` | DELETE | モデルの削除 | 必須 | ✅ 実装済み |
| `/api/models/user/[userId]` | GET | 特定ユーザーのモデル一覧取得 | 不要 | ✅ 実装済み |
| `/api/storage/upload` | POST | ファイルのアップロード | 必須 | ✅ 実装済み |
| `/api/search` | GET | モデル検索 | 不要 | ❌ フェーズ2で実装予定 |
| `/api/favorites/[modelId]` | POST | モデルへのお気に入り登録/解除 | 必須 | ❌ フェーズ2で実装予定 |
| `/api/favorites/[modelId]` | GET | お気に入り状態の確認 | 必須 | ❌ フェーズ2で実装予定 |
| `/api/shares` | POST | モデル共有情報の記録 | 必須 | ❌ フェーズ2で実装予定 |
| `/api/tags` | GET | 人気タグ一覧の取得 | 不要 | ❌ フェーズ2で実装予定 |
| `/api/tags/[tagName]/models` | GET | 特定タグに関連するモデル取得 | 不要 | ❌ フェーズ2で実装予定 |
| `/api/models/[id]/tags` | POST | モデルへのタグ追加 | 必須 | ❌ フェーズ2で実装予定 |

## 2. Supabase APIの利用

### 2.1 認証API

```typescript
// lib/supabase/auth.ts
import { supabase } from './client';

// Google認証
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  
  return { data, error };
}

// サインアウト
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// セッション取得
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
}
```

### 2.2 データベースAPI

```typescript
// lib/supabase/models.ts
import { supabase } from './client';
import { Model } from '@/lib/types';

// モデル一覧取得
export async function getModels(limit = 20, page = 1): Promise<{ data: Model[] | null; error: any }> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  const { data, error } = await supabase
    .from('models')
    .select(`
      *,
      users:user_id (
        name,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false })
    .range(from, to);
  
  return { data, error };
}

// 特定モデル取得
export async function getModelById(id: string): Promise<{ data: Model | null; error: any }> {
  const { data, error } = await supabase
    .from('models')
    .select(`
      *,
      users:user_id (
        name,
        avatar_url
      )
    `)
    .eq('id', id)
    .single();
  
  return { data, error };
}

// モデル作成
export async function createModel(model: Omit<Model, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: any; error: any }> {
  const { data, error } = await supabase
    .from('models')
    .insert(model)
    .select();
  
  return { data, error };
}

// モデル更新
export async function updateModel(id: string, updates: Partial<Model>): Promise<{ data: any; error: any }> {
  const { data, error } = await supabase
    .from('models')
    .update(updates)
    .eq('id', id)
    .select();
  
  return { data, error };
}

// モデル削除
export async function deleteModel(id: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('models')
    .delete()
    .eq('id', id);
  
  return { error };
}
```

### 2.3 ストレージAPI

```typescript
// lib/supabase/storage.ts
import { supabase } from './client';
import { v4 as uuidv4 } from 'uuid';

export async function uploadFile(
  file: File,
  bucketName: string,
  userId: string
): Promise<{ url: string | null; error: any }> {
  // ファイル名の生成
  const timestamp = Date.now();
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${timestamp}_${uuidv4()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });
  
  if (error) {
    return { url: null, error };
  }
  
  // 公開URLの取得
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);
  
  return { url: publicUrl, error: null };
}

export async function deleteFile(
  path: string,
  bucketName: string
): Promise<{ error: any }> {
  const { error } = await supabase.storage
    .from(bucketName)
    .remove([path]);
  
  return { error };
}
```

### 2.4 フェーズ2で追加予定のSupabase API関数

```typescript
// lib/supabase/favorites.ts
import { supabase } from './client';

// お気に入りの切り替え（追加/削除）
export async function toggleFavorite(modelId: string): Promise<{ favorited: boolean, error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { favorited: false, error: '認証が必要です' };
  }
  
  // 現在のお気に入り状態を確認
  const { data: existingFavorite } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('model_id', modelId)
    .single();
  
  if (existingFavorite) {
    // お気に入りを削除
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', existingFavorite.id);
    
    // モデルのお気に入りカウントを更新
    if (!error) {
      await supabase.rpc('decrement_favorite_count', { model_id: modelId });
    }
    
    return { favorited: false, error };
  } else {
    // お気に入りを追加
    const { error } = await supabase
      .from('favorites')
      .insert({ user_id: user.id, model_id: modelId });
    
    // モデルのお気に入りカウントを更新
    if (!error) {
      await supabase.rpc('increment_favorite_count', { model_id: modelId });
    }
    
    return { favorited: true, error };
  }
}

// お気に入り状態の確認
export async function checkFavoriteStatus(modelId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }
  
  // 現在のお気に入り状態を確認
  const { data } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('model_id', modelId)
    .single();
    
  return !!data;
}
```

```typescript
// lib/supabase/shares.ts
import { supabase } from './client';

// 共有情報の記録
export async function recordShare(
  modelId: string, 
  platform: string,
  shareUrl?: string
): Promise<{ success: boolean, error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const userId = user?.id || null; // 未ログインでも記録可能にする（オプショナル）
  
  const { error } = await supabase
    .from('shares')
    .insert({
      user_id: userId,
      model_id: modelId,
      platform,
      share_url: shareUrl || null
    });
  
  // モデルの共有カウントを更新
  if (!error) {
    await supabase.rpc('increment_share_count', { model_id: modelId });
  }
  
  return { success: !error, error };
}

// モデルの共有数取得
export async function getShareCount(modelId: string): Promise<number> {
  const { count, error } = await supabase
    .from('shares')
    .select('id', { count: 'exact' })
    .eq('model_id', modelId);
  
  return count || 0;
}
```

```typescript
// lib/supabase/tags.ts
import { supabase } from './client';

// 人気タグの取得
export async function getPopularTags(limit = 10): Promise<{ data: any[], error: any }> {
  const { data, error } = await supabase
    .from('tags')
    .select(`
      id,
      name,
      model_tags(count)
    `)
    .order('model_tags(count)', { ascending: false })
    .limit(limit);
  
  return { data, error };
}

// タグによるモデル検索
export async function getModelsByTag(
  tagName: string,
  page = 1,
  limit = 12
): Promise<{ data: any[], error: any }> {
  const from = (page - 1) * limit;
  
  const { data, error } = await supabase
    .from('models')
    .select(`
      *,
      users:user_id (
        name,
        avatar_url
      ),
      model_tags!inner(
        tags!inner(
          name
        )
      )
    `)
    .eq('model_tags.tags.name', tagName)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);
  
  return { data, error };
}

// モデルへのタグ追加
export async function addTagsToModel(
  modelId: string,
  tagNames: string[]
): Promise<{ success: boolean, error: any }> {
  // トランザクション的処理（Supabaseではネイティブなトランザクションがない）
  try {
    for (const tagName of tagNames) {
      // タグが存在するか確認、なければ作成
      const { data: existingTag } = await supabase
        .from('tags')
        .select('id')
        .eq('name', tagName.toLowerCase())
        .single();
      
      let tagId = existingTag?.id;
      
      if (!tagId) {
        const { data: newTag, error: createError } = await supabase
          .from('tags')
          .insert({ name: tagName.toLowerCase() })
          .select('id')
          .single();
        
        if (createError) throw createError;
        tagId = newTag.id;
      }
      
      // モデルとタグの関連付け
      const { error: linkError } = await supabase
        .from('model_tags')
        .insert({
          model_id: modelId,
          tag_id: tagId
        })
        .onConflict(['model_id', 'tag_id'])
        .ignore(); // 既に関連付けがあれば無視
      
      if (linkError) throw linkError;
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('タグ追加エラー:', error);
    return { success: false, error };
  }
}
```

## 3. Next.js API Routes

### 3.1 モデルAPIルート

```typescript
// app/api/models/route.ts
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);
  
  const cookieStore = cookies();
  const supabase = createServerClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  const { data, error } = await supabase
    .from('models')
    .select(`
      *,
      users:user_id (
        name,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false })
    .range(from, to);
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
  
  // セッションの確認
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const userId = session.user.id;
    
    // 必要なフィールドの検証
    if (!body.title || !body.file_url) {
      return NextResponse.json({ error: '必須フィールドが不足しています' }, { status: 400 });
    }
    
    // モデルの作成
    const { data, error } = await supabase
      .from('models')
      .insert({
        user_id: userId,
        title: body.title,
        description: body.description || '',
        file_url: body.file_url,
        thumbnail_url: body.thumbnail_url || null,
      })
      .select();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data: data[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 3.2 ファイルアップロードAPIルート

```typescript
// app/api/storage/upload/route.ts
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
  
  // セッションの確認
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucketName = formData.get('bucket') as string;
    
    if (!file || !bucketName) {
      return NextResponse.json({ error: '必須パラメータが不足しています' }, { status: 400 });
    }
    
    // 許可されているバケット名かを確認
    if (!['model_files', 'model_thumbnails', 'avatars'].includes(bucketName)) {
      return NextResponse.json({ error: '無効なバケット名です' }, { status: 400 });
    }
    
    // ファイルサイズの検証
    const MAX_SIZES = {
      'model_files': 100 * 1024 * 1024, // 100MB
      'model_thumbnails': 2 * 1024 * 1024, // 2MB
      'avatars': 5 * 1024 * 1024 // 5MB
    };
    
    if (file.size > MAX_SIZES[bucketName]) {
      return NextResponse.json({ 
        error: `ファイルサイズが大きすぎます。最大サイズ: ${MAX_SIZES[bucketName] / (1024 * 1024)}MB` 
      }, { status: 400 });
    }
    
    // ファイル形式の検証
    const ALLOWED_FORMATS = {
      'model_files': ['glb', 'gltf', 'obj', 'fbx', 'stl'],
      'model_thumbnails': ['jpg', 'jpeg', 'png', 'webp'],
      'avatars': ['jpg', 'jpeg', 'png', 'webp']
    };
    
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !ALLOWED_FORMATS[bucketName].includes(fileExt)) {
      return NextResponse.json({ 
        error: `このファイル形式はサポートされていません。許可される形式: ${ALLOWED_FORMATS[bucketName].join(', ')}` 
      }, { status: 400 });
    }
    
    // ファイル名の生成
    const userId = session.user.id;
    const fileName = `${userId}/${Date.now()}_${uuidv4()}.${fileExt}`;
    
    // アップロード
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // 公開URLの取得
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path);
    
    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 3.3 フェーズ2で追加予定のAPI Routes

#### 3.3.1 お気に入りAPI

```typescript
// app/api/favorites/[modelId]/route.ts
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// お気に入り状態の取得
export async function GET(
  request: Request,
  { params }: { params: { modelId: string } }
) {
  const cookieStore = cookies();
  const supabase = createServerClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ favorited: false });
  }
  
  const { data } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('model_id', params.modelId)
    .single();
  
  return NextResponse.json({ favorited: !!data });
}

// お気に入りの切り替え
export async function POST(
  request: Request,
  { params }: { params: { modelId: string } }
) {
  const cookieStore = cookies();
  const supabase = createServerClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
  
  // セッションの確認
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }
  
  // 現在のお気に入り状態を確認
  const { data: existingFavorite } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('model_id', params.modelId)
    .single();
  
  if (existingFavorite) {
    // お気に入りを削除
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', existingFavorite.id);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // モデルのお気に入りカウントを更新
    await supabase.rpc('decrement_favorite_count', { model_id: params.modelId });
    
    return NextResponse.json({ favorited: false });
  } else {
    // お気に入りを追加
    const { error } = await supabase
      .from('favorites')
      .insert({
        user_id: session.user.id,
        model_id: params.modelId
      });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // モデルのお気に入りカウントを更新
    await supabase.rpc('increment_favorite_count', { model_id: params.modelId });
    
    return NextResponse.json({ favorited: true });
  }
}
```

#### 3.3.2 共有API

```typescript
// app/api/shares/route.ts
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
  
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user.id || null; // 非ログインでも記録可能
  
  try {
    const body = await request.json();
    const { modelId, platform, shareUrl } = body;
    
    if (!modelId || !platform) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています' },
        { status: 400 }
      );
    }
    
    const { error } = await supabase
      .from('shares')
      .insert({
        user_id: userId,
        model_id: modelId,
        platform,
        share_url: shareUrl || null
      });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // モデルの共有カウントを更新
    await supabase.rpc('increment_share_count', { model_id: modelId });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### 3.3.3 タグAPI

```typescript
// app/api/tags/route.ts
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  
  const cookieStore = cookies();
  const supabase = createServerClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
  
  // タグ使用回数でソートして取得
  const { data, error } = await supabase
    .from('tags')
    .select(`
      id,
      name,
      model_tags(count)
    `)
    .order('model_tags(count)', { ascending: false })
    .limit(limit);
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ tags: data });
}
```

```typescript
// app/api/tags/[tagName]/models/route.ts
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { tagName: string } }
) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '12', 10);
  
  const cookieStore = cookies();
  const supabase = createServerClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
  
  const from = (page - 1) * limit;
  
  const { data, error } = await supabase
    .from('models')
    .select(`
      *,
      users:user_id (
        name,
        avatar_url
      ),
      model_tags!inner(
        tags!inner(
          name
        )
      )
    `)
    .eq('model_tags.tags.name', params.tagName.toLowerCase())
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ models: data });
}
```

```typescript
// app/api/models/[id]/tags/route.ts
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const supabase = createServerClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
  
  // セッションの確認
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }
  
  // モデルの所有者を確認
  const { data: model } = await supabase
    .from('models')
    .select('user_id')
    .eq('id', params.id)
    .single();
  
  if (!model) {
    return NextResponse.json({ error: 'モデルが見つかりません' }, { status: 404 });
  }
  
  if (model.user_id !== session.user.id) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  }
  
  try {
    const body = await request.json();
    const { tags } = body;
    
    if (!Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json(
        { error: 'タグは配列で指定してください' },
        { status: 400 }
      );
    }
    
    // 最大5つまでに制限
    const tagsToAdd = tags.slice(0, 5);
    
    // 各タグを処理
    for (const tagName of tagsToAdd) {
      // タグが存在するか確認、なければ作成
      const { data: existingTag } = await supabase
        .from('tags')
        .select('id')
        .eq('name', tagName.toLowerCase())
        .single();
      
      let tagId = existingTag?.id;
      
      if (!tagId) {
        const { data: newTag, error: createError } = await supabase
          .from('tags')
          .insert({ name: tagName.toLowerCase() })
          .select('id')
          .single();
        
        if (createError) throw createError;
        tagId = newTag.id;
      }
      
      // モデルとタグの関連付け
      const { error: linkError } = await supabase
        .from('model_tags')
        .insert({
          model_id: params.id,
          tag_id: tagId
        })
        .onConflict(['model_id', 'tag_id'])
        .ignore(); // 既に関連付けがあれば無視
      
      if (linkError) throw linkError;
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## 4. データフロー

### 4.1 ユーザー認証フロー

```mermaid
sequenceDiagram
    クライアント->>+Next.js: ログインボタンクリック
    Next.js->>+Supabase Auth: signInWithOAuth('google')
    Supabase Auth-->>-Next.js: リダイレクトURL
    Next.js-->>-クライアント: Google認証ページへリダイレクト
    クライアント->>+Google OAuth: 認証情報入力
    Google OAuth-->>-クライアント: 認証成功後、コールバックURLへリダイレクト
    クライアント->>+Next.js: /auth/callback
    Next.js->>+Supabase Auth: getUser()
    Supabase Auth-->>-Next.js: ユーザー情報
    Next.js->>+Supabase DB: ユーザー情報保存/更新
    Supabase DB-->>-Next.js: 完了
    Next.js-->>-クライアント: ホームページへリダイレクト
```

### 4.2 モデルアップロードフロー

```mermaid
sequenceDiagram
    クライアント->>+Next.js: モデルファイルとメタデータ提出
    Next.js->>+Supabase Storage: ファイルアップロード
    Supabase Storage-->>-Next.js: ファイルURL
    Next.js->>+Supabase DB: モデルメタデータ保存
    Supabase DB-->>-Next.js: 保存結果
    Next.js-->>-クライアント: 完了レスポンス
```

### 4.3 モデル一覧取得フロー

```mermaid
sequenceDiagram
    クライアント->>+Next.js: モデル一覧リクエスト
    Next.js->>+Supabase DB: モデルデータ取得クエリ
    Supabase DB-->>-Next.js: モデルデータ
    Next.js-->>-クライアント: モデル一覧レスポンス
```

### 4.4 モデル詳細表示フロー

```mermaid
sequenceDiagram
    クライアント->>+Next.js: モデル詳細リクエスト(ID)
    Next.js->>+Supabase DB: 特定モデル取得クエリ
    Supabase DB-->>-Next.js: モデル詳細データ
    Next.js-->>-クライアント: モデル詳細レスポンス
```

### 4.5 フェーズ2で追加予定のデータフロー

#### 4.5.1 モデル共有フロー

```mermaid
sequenceDiagram
    クライアント->>+Next.js: 共有ボタンクリック
    Next.js-->>クライアント: SNSシェアダイアログ表示
    クライアント->>+外部SNS: シェア情報投稿
    外部SNS-->>-クライアント: 投稿完了
    クライアント->>+Next.js: 共有情報記録リクエスト
    Next.js->>+Supabase: 共有情報保存
    Supabase-->>-Next.js: 保存結果
    Next.js->>+Supabase: 共有カウント増加
    Supabase-->>-Next.js: 更新結果
    Next.js-->>-クライアント: 共有記録完了
```

#### 4.5.2 タグ検索フロー

```mermaid
sequenceDiagram
    クライアント->>+Next.js: タグクリック
    Next.js->>+Supabase: タグに関連するモデル取得
    Supabase-->>-Next.js: モデルデータ
    Next.js-->>-クライアント: タグフィルタリング結果表示
```

#### 4.5.3 お気に入りフロー

```mermaid
sequenceDiagram
    クライアント->>+Next.js: お気に入りボタンクリック
    Next.js->>+Supabase: お気に入り状態確認
    Supabase-->>-Next.js: 現在のお気に入り状態
    alt お気に入り済み
        Next.js->>+Supabase: お気に入り削除
        Supabase-->>-Next.js: 削除結果
        Next.js->>+Supabase: お気に入りカウント減少
        Supabase-->>-Next.js: 更新結果
    else お気に入りなし
        Next.js->>+Supabase: お気に入り追加
        Supabase-->>-Next.js: 追加結果
        Next.js->>+Supabase: お気に入りカウント増加
        Supabase-->>-Next.js: 更新結果
    end
    Next.js-->>-クライアント: お気に入り状態更新
```

## 5. バックエンドワークフロー

### 5.1 ユーザープロフィール更新ワークフロー

1. ユーザーがプロフィール編集フォームを提出
2. フロントエンドでバリデーション実行
3. SupabaseのUpdateエンドポイントにデータ送信
4. Supabaseは認証とバリデーションを実行
5. 成功時にはデータが更新され、クライアントに成功メッセージ返却
6. 失敗時にはエラーメッセージがクライアントに返却

### 5.2 モデル削除ワークフロー

1. ユーザーがモデル削除ボタンをクリック
2. 確認ダイアログ表示
3. 確認後、削除APIエンドポイントにリクエスト送信
4. サーバーサイドでモデルオーナーの検証
5. Supabaseストレージから関連ファイル削除
6. Supabaseデータベースからモデルレコード削除
7. 成功時にはクライアントに成功メッセージ返却
8. クライアント側でUI更新（キャッシュクリア、リダイレクトなど）

## 6. エラーハンドリング

### 6.1 エラー応答フォーマット

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

### 6.2 主なエラーコード

| HTTPステータス | エラーコード | 説明 |
| --- | --- | --- |
| 400 | INVALID_REQUEST | リクエスト形式が不正 |
| 401 | UNAUTHORIZED | 認証が必要 |
| 403 | FORBIDDEN | 権限不足 |
| 404 | NOT_FOUND | リソースが見つからない |
| 409 | CONFLICT | リソース競合 |
| 422 | VALIDATION_FAILED | バリデーションエラー |
| 500 | SERVER_ERROR | サーバー内部エラー |

### 6.3 エラーハンドリングの実装例

```typescript
// lib/api/handleApiError.ts
import { NextResponse } from 'next/server';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export function handleApiError(
  error: any,
  statusCode = 500,
  code = 'SERVER_ERROR',
  message?: string
): NextResponse<ErrorResponse> {
  console.error('API Error:', error);
  
  return NextResponse.json(
    {
      error: {
        code,
        message: message || error.message || 'サーバーエラーが発生しました',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
    },
    { status: statusCode }
  );
}
```

## 7. キャッシュ戦略

### 7.1 サーバーサイドキャッシュ

- **ISR (Incremental Static Regeneration)**: 一定間隔でページを再生成
- **Supabaseキャッシュ**: キャッシュレスポンスヘッダーの設定

```typescript
// ISRの実装例
export const revalidate = 3600; // 1時間ごとに再検証
```

### 7.2 クライアントサイドキャッシュ

- **SWR**: 条件付きリクエスト再検証
- **React Query**: スマートなキャッシュと再フェッチポリシー

```typescript
// SWRの実装例
import useSWR from 'swr';

function useModels() {
  const { data, error, isLoading, mutate } = useSWR('/api/models', fetcher, {
    refreshInterval: 0, // 自動再フェッチなし
    revalidateOnFocus: false, // フォーカス時に再検証しない
    shouldRetryOnError: false, // エラー時に再試行しない
  });
  
  return {
    models: data,
    isLoading,
    isError: error,
    mutate, // 手動で再検証するための関数
  };
}
```

## 8. セキュリティ対策

### 8.1 認証とRLS

- JWT認証によるユーザー識別
- Row Level Security (RLS) によるデータアクセス制御
- API Routes内での認証セッション確認

### 8.2 CSRFとXSS対策

- CSRFトークンの使用
- Content Security Policy (CSP) の設定
- エスケープ処理による出力のサニタイズ

### 8.3 レート制限

- Supabase側でのレート制限設定
- API Routes側での追加のレート制限実装

```typescript
// app/api/middleware.ts
import rateLimit from 'express-rate-limit';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // IPごとに15分間で100リクエストまで
  standardHeaders: true,
  legacyHeaders: false,
});

export function middleware(request: NextRequest) {
  // レート制限の適用
  // ...
}
```

## 9. パフォーマンス最適化

### 9.1 データベースクエリ最適化

- 必要なフィールドのみを選択
- ページネーションの実装
- インデックスの活用

### 9.2 レスポンスサイズの最適化

- 不要なデータの削除
- 圧縮の使用
- キャッシュの有効活用

### 9.3 バッチ処理

- 複数のリクエストをバッチ処理することで、ネットワークオーバーヘッドを削減
- 一度に複数のオペレーションを実行するエンドポイントの実装

## 10. API拡張計画

### 10.1 検索・フィルタリングAPI

```typescript
// app/api/search/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category');
  const sortBy = searchParams.get('sort') || 'created_at';
  const sortOrder = searchParams.get('order') || 'desc';
  
  // 検索ロジックの実装
  // ...
}
```

### 10.2 ソーシャル機能API

- お気に入り機能のAPI
- コメント機能のAPI
- フォロー機能のAPI

### 10.3 分析・統計API

- ダウンロード数集計API
- 人気モデルランキングAPI
- ユーザーアクティビティAPI 

## 10. インフラストラクチャ設定詳細

### 10.1 Vercel設定

#### 10.1.1 ドメイン設定
- **プライマリードメイン**: katamari.jp
- **DNSレコード設定**:
  ```
  A     @    76.76.21.21
  CNAME www  cname.vercel-dns.com.
  ```
- **リダイレクト設定**:
  - www.katamari.jp → katamari.jp
  - katawaku.com → katamari.jp

#### 10.1.2 環境変数
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 10.1.3 ビルド設定
- **フレームワークプリセット**: Next.js
- **ノードバージョン**: 18.x
- **ビルドコマンド**: `next build`
- **出力ディレクトリ**: `.next`
- **インストールコマンド**: `npm install`

#### 10.1.4 デプロイフック
```
https://api.vercel.com/v1/integrations/deploy/prj_xxxxxxxxxxxx/HOOK_ID
```

### 10.2 Supabase設定

#### 10.2.1 プロジェクト設定
- **プロジェクト名**: katamari
- **リージョン**: Tokyo (ap-northeast-1)
- **データベースパスワード**: `xxxxxxxxxxxxxxxx`
- **接続文字列**: `postgresql://postgres:xxxxxxxxxxxxxxxx@db.xxxxxxxxxxxx.supabase.co:5432/postgres`

#### 10.2.2 認証設定
- **サイトURL**: https://katamari.jp
- **リダイレクトURL**: 
  - https://katamari.jp/auth/callback
  - http://localhost:3000/auth/callback (開発用)
- **JWT期限**: アクセストークン (3600秒), リフレッシュトークン (43200秒)
- **メール確認**: 無効 (Google認証のみ使用)

#### 10.2.3 Google認証設定
- **クライアントID**: `xxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
- **クライアントシークレット**: `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx`
- **承認済みドメイン**: katamari.jp, localhost
- **承認済みリダイレクトURI**:
  - https://katamari.jp/auth/callback
  - http://localhost:3000/auth/callback

### 10.3 Google Analytics 4設定

#### 10.3.1 プロパティ設定
- **プロパティ名**: カタマリ
- **プロパティID**: 123456789
- **測定ID**: G-XXXXXXXXXX
- **データストリーム**: Web (https://katamari.jp)

#### 10.3.2 イベントトラッキング設定
以下のカスタムイベントを設定します：

- **model_view**: モデル詳細ページの閲覧
  - パラメータ: model_id, model_title
- **model_download**: モデルのダウンロード
  - パラメータ: model_id, model_title, file_format
- **model_share**: モデルのSNS共有
  - パラメータ: model_id, model_title, platform (twitter/facebook/line)
- **model_favorite**: モデルへのお気に入り
  - パラメータ: model_id, model_title
- **model_search**: モデル検索
  - パラメータ: query, results_count
- **tag_click**: タグクリック
  - パラメータ: tag_name

#### 10.3.3 コンバージョン設定
以下のイベントをコンバージョンとして設定します：

- **model_download**: 主要コンバージョン
- **model_share**: セカンダリコンバージョン
- **user_signup**: ユーザー獲得コンバージョン

## 11. ログ機能

### 11.1 ログ実装

セキュリティ監視とトラブルシューティングのために、以下のログ機能を実装します。

#### 11.1.1 ログクラス

```typescript
// lib/logger.ts
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogData {
  message: string;
  level: LogLevel;
  timestamp: string;
  context?: Record<string, any>;
  userId?: string;
  url?: string;
  userAgent?: string;
}

export class Logger {
  private static instance: Logger;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  // コンテキストから個人情報を削除
  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    const sanitized = { ...context };
    
    // 機密情報のフィールドを削除/マスク
    const sensitiveFields = ['password', 'token', 'credit_card', 'secret'];
    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  public async log(level: LogLevel, message: string, context?: Record<string, any>): Promise<void> {
    const timestamp = new Date().toISOString();
    let userId: string | undefined;
    let userContext: Record<string, any> = {};
    
    if (context) {
      userId = context.userId;
      userContext = this.sanitizeContext(context);
    }
    
    const logData: LogData = {
      message,
      level,
      timestamp,
      context: userContext,
      userId,
    };
    
    // 開発環境ではコンソールに出力
    if (this.isDevelopment) {
      const consoleMethod = {
        [LogLevel.DEBUG]: console.debug,
        [LogLevel.INFO]: console.info,
        [LogLevel.WARN]: console.warn,
        [LogLevel.ERROR]: console.error,
      }[level];
      
      consoleMethod(`[${timestamp}] [${level.toUpperCase()}] ${message}`, userContext);
      return;
    }
    
    // 本番環境ではログAPIにPOST
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData),
      });
    } catch (error) {
      // フォールバックとしてコンソールにログ
      console.error('Failed to send log to API:', error);
      console.error(logData);
    }
  }
  
  public debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  public info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }
  
  public warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }
  
  public error(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context);
  }
}

// シングルトンインスタンスをエクスポート
export const logger = Logger.getInstance();
```

#### 11.1.2 クライアントサイドログ

```typescript
// lib/clientLogger.ts
import { LogLevel } from './logger';

export interface ClientLogData {
  message: string;
  level: LogLevel;
  timestamp: string;
  context?: Record<string, any>;
  url: string;
  userAgent: string;
}

class ClientLogger {
  private static instance: ClientLogger;

  private constructor() {}

  public static getInstance(): ClientLogger {
    if (!ClientLogger.instance) {
      ClientLogger.instance = new ClientLogger();
    }
    return ClientLogger.instance;
  }

  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    const sanitized = { ...context };
    
    // 機密情報のフィールドを削除/マスク
    const sensitiveFields = ['password', 'token', 'credit_card', 'secret'];
    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  public async log(level: LogLevel, message: string, context?: Record<string, any>): Promise<void> {
    const timestamp = new Date().toISOString();
    let userContext: Record<string, any> = {};
    
    if (context) {
      userContext = this.sanitizeContext(context);
    }
    
    const logData: ClientLogData = {
      message,
      level,
      timestamp,
      context: userContext,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };
    
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = {
        [LogLevel.DEBUG]: console.debug,
        [LogLevel.INFO]: console.info,
        [LogLevel.WARN]: console.warn,
        [LogLevel.ERROR]: console.error,
      }[level];
      
      consoleMethod(`[CLIENT] [${timestamp}] [${level.toUpperCase()}] ${message}`, userContext);
      return;
    }
    
    // ログAPIにPOST
    try {
      await fetch('/api/logs/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData),
      });
    } catch (error) {
      // フォールバックとしてコンソールにログ
      console.error('Failed to send client log to API:', error);
      console.error(logData);
    }
  }
  
  public debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  public info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }
  
  public warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }
  
  public error(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context);
  }
}

// シングルトンインスタンスをエクスポート
export const clientLogger = ClientLogger.getInstance();
```

#### 11.1.3 ログAPI

```typescript
// app/api/logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LogData } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: NextRequest) {
  try {
    const logData: LogData = await req.json();
    
    // IP情報を追加
    const ip = req.headers.get('x-forwarded-for') || req.ip || '';
    logData.ip = ip;
    
    // ユーザーエージェント情報を追加
    const userAgent = req.headers.get('user-agent') || '';
    logData.userAgent = userAgent;
    
    // URLを追加
    const url = req.headers.get('referer') || '';
    logData.url = url;
    
    // Supabaseにログを保存
    const { error } = await supabaseAdmin
      .from('system_logs')
      .insert([logData]);
    
    if (error) {
      console.error('Error saving log to Supabase:', error);
      return NextResponse.json({ error: 'Failed to save log' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```