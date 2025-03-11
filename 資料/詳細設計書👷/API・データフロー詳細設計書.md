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
| `/api/articles` | GET | 記事一覧の取得 | 不要 | ✅ 実装済み |
| `/api/articles/[id]` | GET | 特定記事の詳細情報取得 | 条件付き | ✅ 実装済み |
| `/api/articles` | POST | 新規記事の作成 | 必須 | ✅ 実装済み |
| `/api/articles/[id]` | PUT | 記事情報の更新 | 必須 | ✅ 実装済み |
| `/api/articles/[id]` | DELETE | 記事の削除 | 必須 | ✅ 実装済み |
| `/api/articles/user/[userId]` | GET | 特定ユーザーの記事一覧取得 | 条件付き | ✅ 実装済み |
| `/api/storage/upload` | POST | ファイルのアップロード | 必須 | ✅ 実装済み |
| `/api/media/upload` | POST | 記事用メディアのアップロード | 必須 | ❌ 実装予定 |
| `/api/download_files/upload` | POST | 記事添付ファイルのアップロード | 必須 | ❌ 実装予定 |
| `/api/preview/3d` | POST | 3Dモデルのプレビュー生成 | 必須 | ❌ 実装予定 |
| `/api/search` | GET | 記事検索 | 不要 | ❌ フェーズ2で実装予定 |
| `/api/favorites/[articleId]` | POST | 記事へのお気に入り登録/解除 | 必須 | ❌ フェーズ2で実装予定 |
| `/api/favorites/[articleId]` | GET | お気に入り状態の確認 | 必須 | ❌ フェーズ2で実装予定 |
| `/api/shares` | POST | 記事共有情報の記録 | 必須 | ❌ フェーズ2で実装予定 |
| `/api/stats/view/[articleId]` | POST | 記事閲覧数の記録 | 不要 | ❌ フェーズ2で実装予定 |
| `/api/stats/download/[articleId]` | POST | ファイルダウンロード数の記録 | 不要 | ❌ フェーズ2で実装予定 |
| `/api/tags` | GET | 人気タグ一覧の取得 | 不要 | ❌ フェーズ2で実装予定 |
| `/api/tags/[tagName]/articles` | GET | 特定タグに関連する記事取得 | 不要 | ❌ フェーズ2で実装予定 |
| `/api/articles/[id]/tags` | POST | 記事へのタグ追加 | 必須 | ❌ フェーズ2で実装予定 |

## 2. 主要APIフロー詳細

### 2.1 記事作成フロー

記事作成は複数のAPIリクエストを含む複雑なプロセスです。以下にフロー全体を説明します。

#### 2.1.1 記事作成フロー概要

1. リッチテキストエディタで記事を作成（クライアントサイド）
2. メディア（画像・動画）をアップロード（エディタ編集中）
3. 記事本文を一時保存（定期的）
4. ヒーロー画像をアップロード
5. 添付ファイル一式をアップロード（フォルダ構造維持）
6. 記事情報をデータベースに保存
7. 公開設定の場合は公開処理

#### 2.1.2 リッチテキストエディタの実装

TipTapエディタを使用し、以下の機能を提供します：

- 基本的なテキスト書式設定（太字、斜体、箇条書きなど）
- 画像アップロードと埋め込み
- 動画埋め込み
- 3Dモデルファイル埋め込み
- コードブロック

エディタの内容はJSON形式で保存され、レンダリング時に適切なHTMLに変換されます。

#### 2.1.3 メディアアップロードAPI

##### `/api/media/upload` エンドポイント詳細

**リクエスト**:
```json
{
  "method": "POST",
  "headers": {
    "Content-Type": "multipart/form-data"
  },
  "body": {
    "file": "[ファイルオブジェクト]",
    "articleId": "一時記事ID（ドラフト作成時に生成）",
    "mediaType": "image|video|model"
  }
}
```

**レスポンス**:
```json
{
  "success": true,
  "url": "https://katamari.jp/storage/v1/media/user_id/article_id/filename.jpg",
  "mediaId": "生成されたメディアID",
  "width": 800,
  "height": 600
}
```

**処理フロー**:
1. ユーザー認証確認
2. ファイルバリデーション（タイプ、サイズ、セキュリティチェック）
3. Supabaseストレージの`media`バケットにアップロード
4. 画像の場合、メタデータ（幅、高さ）を抽出
5. `article_media`テーブルに情報を登録
6. アップロード済みファイルのURLと情報を返却

#### 2.1.4 ファイルアップロードAPI

##### `/api/download_files/upload` エンドポイント詳細

**リクエスト**:
```json
{
  "method": "POST",
  "headers": {
    "Content-Type": "multipart/form-data"
  },
  "body": {
    "file": "[ファイルオブジェクト]",
    "articleId": "記事ID",
    "relativePath": "ファイルの相対パス（フォルダ構造維持用）",
    "fileType": "ファイルタイプ"
  }
}
```

**レスポンス**:
```json
{
  "success": true,
  "url": "https://katamari.jp/storage/v1/articles/user_id/article_id/path/filename.stl",
  "fileId": "生成されたファイルID",
  "fileSize": 1024000
}
```

**処理フロー**:
1. ユーザー認証確認
2. ファイルバリデーション
3. フォルダパス構造の検証と作成
4. Supabaseストレージの`articles`バケットに指定パスでアップロード
5. `files`テーブルに情報を登録
6. アップロード済みファイルのURLと情報を返却

#### 2.1.5 複数ファイルの一括アップロード

フォルダ構造を維持したまま複数ファイルをアップロードするために、クライアント側でフォルダツリーを解析し、各ファイルを適切な相対パスで`/api/download_files/upload`エンドポイントに送信します。

```javascript
// フォルダ構造を維持したアップロード処理の例
async function uploadFolderContents(folderEntry, articleId) {
  // FileSystemAPIでフォルダ内のすべてのエントリを取得
  const entries = await readDirectoryEntries(folderEntry);
  
  for (const entry of entries) {
    if (entry.isFile) {
      // ファイルの場合は相対パスでアップロード
      const file = await entry.file();
      const relativePath = entry.fullPath;
      await uploadFile(file, articleId, relativePath);
    } else if (entry.isDirectory) {
      // ディレクトリの場合は再帰的に処理
      await uploadFolderContents(entry, articleId);
    }
  }
}
```

### 2.2 記事取得フロー

#### 2.2.1 記事一覧取得

##### `/api/articles` エンドポイント詳細

**リクエスト**:
```json
{
  "method": "GET",
  "params": {
    "page": 1,
    "limit": 10,
    "sort": "created_at:desc",
    "filter": "tag:3dprinting"
  }
}
```

**レスポンス**:
```json
{
  "articles": [
    {
      "id": "記事ID",
      "title": "記事タイトル",
      "author": {
        "id": "著者ID",
        "name": "著者名",
        "avatar_url": "アバターURL"
      },
      "hero_image": "ヒーロー画像URL",
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-02T00:00:00Z",
      "view_count": 123,
      "download_count": 45
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "total_pages": 10
  }
}
```

**処理フロー**:
1. クエリパラメータの解析
2. Supabase RLSポリシーに基づいた記事一覧の取得
3. 著者情報の結合
4. ページネーション情報の計算
5. 結果の整形と返却

#### 2.2.2 記事詳細取得

##### `/api/articles/[id]` エンドポイント詳細

**リクエスト**:
```json
{
  "method": "GET",
  "params": {
    "id": "記事ID"
  }
}
```

**レスポンス**:
```json
{
  "article": {
    "id": "記事ID",
    "title": "記事タイトル",
    "content": "リッチテキストJSON",
    "author": {
      "id": "著者ID",
      "name": "著者名",
      "avatar_url": "アバターURL"
    },
    "hero_image": "ヒーロー画像URL",
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-02T00:00:00Z",
    "view_count": 123,
    "download_count": 45,
    "media": [
      {
        "id": "メディアID",
        "url": "メディアURL",
        "media_type": "image",
        "alt_text": "代替テキスト"
      }
    ],
    "files": [
      {
        "id": "ファイルID",
        "filename": "ファイル名",
        "file_path": "ファイルパス",
        "file_size": 1024000,
        "file_type": "stl"
      }
    ]
  }
}
```

**処理フロー**:
1. 記事IDの検証
2. Supabase RLSポリシーに基づいた記事情報の取得
3. 著者情報の結合
4. 関連メディア情報の結合
5. 関連ファイル情報の結合
6. 閲覧数の更新（非認証ユーザーの場合はセッションベース）
7. 結果の整形と返却

### 2.3 記事更新フロー

##### `/api/articles/[id]` (PUT) エンドポイント詳細

**リクエスト**:
```json
{
  "method": "PUT",
  "params": {
    "id": "記事ID"
  },
  "body": {
    "title": "更新後の記事タイトル",
    "content": "更新後のリッチテキストJSON",
    "hero_image": "更新後のヒーロー画像ID",
    "status": "draft|published"
  }
}
```

**レスポンス**:
```json
{
  "success": true,
  "article": {
    "id": "記事ID",
    "title": "更新後の記事タイトル",
    "updated_at": "2023-01-03T00:00:00Z"
  }
}
```

**処理フロー**:
1. ユーザー認証と権限確認
2. 記事IDの検証
3. 更新データのバリデーション
4. 記事情報の更新
5. ヒーロー画像が変更された場合は関連テーブルの更新
6. 結果の整形と返却

### 2.3 記事削除フロー

##### `/api/articles/[id]` (DELETE) エンドポイント詳細

**リクエスト**:
```json
{
  "method": "DELETE",
  "params": {
    "id": "記事ID"
  }
}
```

**レスポンス**:
```json
{
  "success": true
}
```

**処理フロー**:
1. ユーザー認証と権限確認
2. 記事IDの検証
3. 関連ファイルのストレージからの削除
4. 記事情報のデータベースからの削除（カスケード削除）
5. 結果の返却

## 3. Supabase APIの利用

### 3.1 認証API

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

### 3.2 データベースAPI

```typescript
// lib/supabase/articles.ts
import { supabase } from './client';
import { Article } from '@/lib/types';

// 記事一覧取得
export async function getArticles(limit = 20, page = 1): Promise<{ data: Article[] | null; error: any }> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      users:author_id (
        name,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false })
    .range(from, to);
  
  return { data, error };
}

// 特定記事取得
export async function getArticleById(id: string): Promise<{ data: Article | null; error: any }> {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      users:author_id (
        name,
        avatar_url
      )
    `)
    .eq('id', id)
    .single();
  
  return { data, error };
}

// 記事作成
export async function createArticle(article: Omit<Article, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: any; error: any }> {
  const { data, error } = await supabase
    .from('articles')
    .insert(article)
    .select();
  
  return { data, error };
}

// 記事更新
export async function updateArticle(id: string, updates: Partial<Article>): Promise<{ data: any; error: any }> {
  const { data, error } = await supabase
    .from('articles')
    .update(updates)
    .eq('id', id)
    .select();
  
  return { data, error };
}

// 記事削除
export async function deleteArticle(id: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id);
  
  return { error };
}
```

### 3.3 ストレージAPI

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

### 3.4 フェーズ2で追加予定のSupabase API関数

```typescript
// lib/supabase/favorites.ts
import { supabase } from './client';

// お気に入りの切り替え（追加/削除）
export async function toggleFavorite(articleId: string): Promise<{ favorited: boolean, error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { favorited: false, error: '認証が必要です' };
  }
  
  // 現在のお気に入り状態を確認
  const { data: existingFavorite } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('article_id', articleId)
    .single();
  
  if (existingFavorite) {
    // お気に入りを削除
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', existingFavorite.id);
    
    // 記事のお気に入りカウントを更新
    if (!error) {
      await supabase.rpc('decrement_favorite_count', { article_id: articleId });
    }
    
    return { favorited: false, error };
  } else {
    // お気に入りを追加
    const { error } = await supabase
      .from('favorites')
      .insert({ user_id: user.id, article_id: articleId });
    
    // 記事のお気に入りカウントを更新
    if (!error) {
      await supabase.rpc('increment_favorite_count', { article_id: articleId });
    }
    
    return { favorited: true, error };
  }
}

// お気に入り状態の確認
export async function checkFavoriteStatus(articleId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }
  
  // 現在のお気に入り状態を確認
  const { data } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('article_id', articleId)
    .single();
    
  return !!data;
}
```

```typescript
// lib/supabase/shares.ts
import { supabase } from './client';

// 共有情報の記録
export async function recordShare(
  articleId: string, 
  platform: string,
  shareUrl?: string
): Promise<{ success: boolean, error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const userId = user?.id || null; // 未ログインでも記録可能にする（オプショナル）
  
  const { error } = await supabase
    .from('shares')
    .insert({
      user_id: userId,
      article_id: articleId,
      platform,
      share_url: shareUrl || null
    });
  
  // 記事の共有カウントを更新
  if (!error) {
    await supabase.rpc('increment_share_count', { article_id: articleId });
  }
  
  return { success: !error, error };
}

// 記事の共有数取得
export async function getShareCount(articleId: string): Promise<number> {
  const { count, error } = await supabase
    .from('shares')
    .select('id', { count: 'exact' })
    .eq('article_id', articleId);
  
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
      article_tags(count)
    `)
    .order('article_tags(count)', { ascending: false })
    .limit(limit);
  
  return { data, error };
}

// タグによる記事検索
export async function getArticlesByTag(
  tagName: string,
  page = 1,
  limit = 12
): Promise<{ data: any[], error: any }> {
  const from = (page - 1) * limit;
  
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      users:author_id (
        name,
        avatar_url
      ),
      article_tags!inner(
        tags!inner(
          name
        )
      )
    `)
    .eq('article_tags.tags.name', tagName)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);
  
  return { data, error };
}

// 記事へのタグ追加
export async function addTagsToArticle(
  articleId: string,
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
      
      // 記事とタグの関連付け
      const { error: linkError } = await supabase
        .from('article_tags')
        .insert({
          article_id: articleId,
          tag_id: tagId
        })
        .onConflict(['article_id', 'tag_id'])
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

## 4. Next.js API Routes

### 4.1 ユーザーセッション取得API

```typescript
// app/api/auth/session/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  
  return NextResponse.json({ session });
}
```

### 4.2 記事一覧取得API

```typescript
// app/api/articles/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '10';
  const offset = searchParams.get('offset') || '0';
  
  const supabase = createRouteHandlerClient({ cookies });
  
  const { data, error } = await supabase
    .from('articles')
    .select('*, users!author_id(name, avatar_url)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(parseInt(limit))
    .offset(parseInt(offset));
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { title, content, hero_image, status = 'draft' } = await request.json();
  
  const { data, error } = await supabase
    .from('articles')
    .insert([
      { 
        author_id: session.user.id,
        title,
        content,
        hero_image,
        status
      }
    ])
    .select()
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ data });
}
```

### 4.3 記事用メディアアップロードAPI

```typescript
// app/api/media/upload/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const article_id = formData.get('article_id') as string;
    const media_type = formData.get('media_type') as string;
    const alt_text = formData.get('alt_text') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    // ファイル名を生成（ユニークにするためにタイムスタンプとUUIDを使用）
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${session.user.id}/${article_id}/${timestamp}_${crypto.randomUUID()}.${fileExt}`;
    
    // Supabaseストレージにアップロード
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('media')
      .upload(fileName, file, {
        cacheControl: '3600',
        contentType: file.type,
      });
    
    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 500 });
    }
    
    // 公開URLを取得
    const { data: urlData } = await supabase
      .storage
      .from('media')
      .getPublicUrl(fileName);
    
    // article_mediaテーブルに登録
    const { data, error } = await supabase
      .from('article_media')
      .insert([
        {
          article_id,
          media_type,
          url: urlData.publicUrl,
          alt_text,
        }
      ])
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error uploading media:', error);
    return NextResponse.json({ error: 'Failed to upload media' }, { status: 500 });
  }
}
```

### 4.4 ファイルアップロードAPI

```typescript
// app/api/download_files/upload/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const article_id = formData.get('article_id') as string;
    const relative_path = formData.get('relative_path') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    // ファイルパスを生成（フォルダ構造を維持）
    const basePath = `${session.user.id}/${article_id}`;
    const filePath = relative_path ? `${basePath}/${relative_path}/${file.name}` : `${basePath}/${file.name}`;
    
    // Supabaseストレージにアップロード
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('files')
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type,
      });
    
    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 500 });
    }
    
    // 公開URLを取得
    const { data: urlData } = await supabase
      .storage
      .from('files')
      .getPublicUrl(filePath);
    
    // filesテーブルに登録
    const fileExt = file.name.split('.').pop().toLowerCase();
    const fileType = ['stl', 'obj', 'gltf', 'glb'].includes(fileExt) ? fileExt : 'other';
    
    const { data, error } = await supabase
      .from('files')
      .insert([
        {
          article_id,
          filename: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: fileType
        }
      ])
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
```

## 4. データフローシーケンス図

### 4.1 記事投稿フロー

以下のシーケンス図は、記事投稿の全体フローを表しています。

```mermaid
sequenceDiagram
    actor User as ユーザー
    participant FE as フロントエンド
    participant Next as Next.js Server
    participant Media as /api/media/upload
    participant Files as /api/download_files/upload
    participant API as /api/articles
    participant SupaDB as Supabase DB
    participant SupaSt as Supabase Storage
    
    User->>FE: 1. 記事エディタを開く
    FE->>API: 2. ドラフト記事の作成
    API->>SupaDB: 3. ドラフト記事のレコード作成
    SupaDB-->>API: 4. 記事ID返却
    API-->>FE: 5. 記事ID返却
    
    User->>FE: 6. リッチテキスト編集
    
    par メディアアップロード（記事作成中に並行処理）
        User->>FE: 7a. 画像/動画挿入
        FE->>Media: 8a. メディアアップロード
        Media->>SupaSt: 9a. mediaバケットにファイル保存
        Media->>SupaDB: 10a. article_mediaレコード作成
        Media-->>FE: 11a. メディアURL返却
        FE-->>User: 12a. エディタに画像/動画表示
    end
    
    User->>FE: 13. 記事内容の保存
    FE->>API: 14. 記事内容の更新
    API->>SupaDB: 15. 記事レコード更新
    SupaDB-->>API: 16. 更新結果返却
    API-->>FE: 17. 保存完了表示
    
    par 添付ファイルアップロード
        User->>FE: 18. フォルダ/ファイル選択
        FE->>FE: 19. フォルダ構造の解析
        loop 各ファイルに対して
            FE->>Files: 20. 相対パス付きでファイルアップロード
            Files->>SupaSt: 21. articlesバケットに保存
            Files->>SupaDB: 22. filesレコード作成
            Files-->>FE: 23. ファイルURL返却
        end
        FE-->>User: 24. アップロード完了表示
    end
    
    User->>FE: 25. 記事の公開
    FE->>API: 26. ステータスを公開に変更
    API->>SupaDB: 27. 記事ステータス更新
    SupaDB-->>API: 28. 更新結果返却
    API-->>FE: 29. 公開完了表示
    FE-->>User: 30. 記事詳細ページへリダイレクト
```

### 4.2 メディアアップロードフロー

以下のシーケンス図は、リッチテキストエディタ内でのメディアアップロードフローの詳細を表しています。

```mermaid
sequenceDiagram
    actor User as ユーザー
    participant Editor as リッチテキストエディタ
    participant FE as フロントエンド
    participant Media as /api/media/upload
    participant SupaDB as Supabase DB
    participant SupaSt as Supabase Storage
    
    User->>Editor: 1. 画像/動画挿入ボタンをクリック
    Editor->>User: 2. ファイル選択ダイアログ表示
    User->>Editor: 3. メディアファイル選択
    Editor->>FE: 4. アップロード処理呼び出し
    FE->>FE: 5. ファイル検証（サイズ、タイプ）
    FE->>Media: 6. メディアファイル送信
    Media->>Media: 7. 認証確認とバリデーション
    Media->>SupaSt: 8. mediaバケットにファイル保存
    SupaSt-->>Media: 9. ストレージパス返却
    
    alt 画像ファイルの場合
        Media->>Media: 10a. 画像メタデータ取得
        Media->>SupaDB: 11a. media_type=imageでレコード作成
    else 動画ファイルの場合
        Media->>SupaDB: 10b. media_type=videoでレコード作成
    else 3Dモデルファイルの場合
        Media->>SupaDB: 10c. media_type=modelでレコード作成
    end
    
    SupaDB-->>Media: 12. メディアIDと保存結果返却
    Media-->>FE: 13. メディアURLとID返却
    FE->>Editor: 14. エディタにメディア挿入
    Editor-->>User: 15. メディアの表示
```

### 4.3 フォルダ構造を維持したファイルアップロードフロー

以下のシーケンス図は、記事の添付ファイルとして、フォルダ構造を維持したままファイルをアップロードするフローを表しています。

```mermaid
sequenceDiagram
    actor User as ユーザー
    participant FE as フロントエンド
    participant FSA as FileSystem API
    participant Upload as アップロードモジュール
    participant Files as /api/download_files/upload
    participant SupaDB as Supabase DB
    participant SupaSt as Supabase Storage
    
    User->>FE: 1. フォルダアップロードボタンをクリック
    FE->>User: 2. フォルダ選択ダイアログ表示
    User->>FE: 3. フォルダ選択
    FE->>FSA: 4. フォルダエントリ取得
    FSA-->>FE: 5. フォルダ構造返却
    FE->>FE: 6. フォルダ構造の解析
    
    loop 各ファイルに対して
        FE->>Upload: 7. ファイルと相対パス情報を送信
        Upload->>Files: 8. multipart/form-dataでファイル送信
        Files->>Files: 9. 認証確認とバリデーション
        Files->>SupaSt: 10. articlesバケットに相対パスを保持してファイル保存
        SupaSt-->>Files: 11. ストレージパス返却
        Files->>SupaDB: 12. filesテーブルにレコード作成
        SupaDB-->>Files: 13. ファイルID返却
        Files-->>Upload: 14. アップロード結果返却
        Upload-->>FE: 15. ファイル処理完了通知
        FE->>FE: 16. 進捗状況更新
    end
    
    FE-->>User: 17. 全ファイルのアップロード完了表示
    FE->>SupaDB: 18. 記事のhas_filesフラグを更新
    SupaDB-->>FE: 19. 更新結果返却
    FE-->>User: 20. ファイル構造プレビューの表示
```

### 4.4 記事閲覧フロー

以下のシーケンス図は、記事の閲覧処理フローを表しています。

```mermaid
sequenceDiagram
    actor User as ユーザー
    participant Browser as ブラウザ
    participant Next as Next.js Server
    participant API as /api/articles/[id]
    participant Stats as /api/stats/view/[id]
    participant SupaDB as Supabase DB
    participant SupaSt as Supabase Storage
    
    User->>Browser: 1. 記事URLにアクセス
    Browser->>Next: 2. HTTPリクエスト
    Next->>API: 3. 記事ID指定でデータ取得
    API->>SupaDB: 4. 記事データ取得
    SupaDB-->>API: 5. 記事データ返却
    API->>SupaDB: 6. 著者データ取得
    SupaDB-->>API: 7. 著者データ返却
    API->>SupaDB: 8. メディアデータ取得
    SupaDB-->>API: 9. メディアデータ返却
    API->>SupaDB: 10. ファイル情報取得
    SupaDB-->>API: 11. ファイル情報返却
    API-->>Next: 12. 統合されたデータ返却
    
    par サーバーサイドレンダリング
        Next->>Browser: 13a. レンダリング済みHTML
    and 閲覧数カウント（非同期）
        Next->>Stats: 13b. 閲覧カウント増加リクエスト
        Stats->>SupaDB: 14b. view_count更新
        SupaDB-->>Stats: 15b. 更新結果
    end
    
    Browser-->>User: 16. 記事ページ表示
    
    opt ファイルダウンロード
        User->>Browser: 17. ダウンロードボタンクリック
        Browser->>SupaSt: 18. ファイルダウンロードリクエスト
        SupaSt-->>Browser: 19. ファイルデータ
        Browser-->>User: 20. ファイル保存ダイアログ
        Browser->>SupaDB: 21. ダウンロードカウント増加
    end
```

## 5. バックエンドワークフロー

### 5.1 ユーザープロフィール更新ワークフロー

1. ユーザーがプロフィール編集フォームを提出
2. フロントエンドでバリデーション実行
3. SupabaseのUpdateエンドポイントにデータ送信
4. Supabaseは認証とバリデーションを実行
5. 成功時にはデータが更新され、クライアントに成功メッセージ返却
6. 失敗時にはエラーメッセージがクライアントに返却

### 5.2 記事削除ワークフロー

1. ユーザーが記事削除ボタンをクリック
2. 確認ダイアログ表示
3. 確認後、削除APIエンドポイントにリクエスト送信
4. サーバーサイドで記事作成者の検証
5. Supabaseストレージから関連ファイル削除
6. Supabaseデータベースから記事レコード削除
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

function useArticles() {
  const { data, error, isLoading, mutate } = useSWR('/api/articles', fetcher, {
    refreshInterval: 0, // 自動再フェッチなし
    revalidateOnFocus: false, // フォーカス時に再検証しない
    shouldRetryOnError: false, // エラー時に再試行しない
  });
  
  return {
    articles: data,
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
- 人気記事ランキングAPI
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

- **article_view**: 記事詳細ページの閲覧
  - パラメータ: article_id, article_title
- **article_download**: 記事のダウンロード
  - パラメータ: article_id, article_title, file_format
- **article_share**: 記事のSNS共有
  - パラメータ: article_id, article_title, platform (twitter/facebook/line)
- **article_favorite**: 記事へのお気に入り
  - パラメータ: article_id, article_title
- **article_search**: 記事検索
  - パラメータ: query, results_count
- **tag_click**: タグクリック
  - パラメータ: tag_name

#### 10.3.3 コンバージョン設定
以下のイベントをコンバージョンとして設定します：

- **article_download**: 主要コンバージョン
- **article_share**: セカンダリコンバージョン
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