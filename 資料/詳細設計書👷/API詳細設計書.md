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

### 1.2 実装済みAPIエンドポイント一覧

| エンドポイント | メソッド | 説明 | 認証 |
| --- | --- | --- | --- |
| `/api/auth/session` | GET | ユーザーセッション情報の取得 | 任意 |
| `/api/articles` | GET | 記事一覧の取得 | 不要 |
| `/api/articles/[id]` | GET | 特定記事の詳細情報取得 | 条件付き |
| `/api/articles` | POST | 新規記事の作成 | 必須 |
| `/api/articles/[id]` | PUT | 記事情報の更新 | 必須 |
| `/api/articles/[id]` | DELETE | 記事の削除 | 必須 |
| `/api/articles/user/[userId]` | GET | 特定ユーザーの記事一覧取得 | 条件付き |
| `/api/storage/upload` | POST | ファイルのアップロード | 必須 |
| `/api/media/upload` | POST | 記事用メディアのアップロード | 必須 |
| `/api/download_files/upload` | POST | 記事添付ファイルのアップロード | 必須 |
| `/api/favorites/[articleId]` | POST | 記事へのお気に入り登録/解除 | 必須 |
| `/api/favorites/[articleId]` | GET | お気に入り状態の確認 | 必須 |
| `/api/favorites` | GET | ユーザーのお気に入り一覧取得 | 必須 |
| `/api/stats/view/[articleId]` | POST | 記事閲覧数の記録 | 不要 |
| `/api/stats/download/[articleId]` | POST | ファイルダウンロード数の記録 | 不要 |

## 2. 認証API

### 2.1 セッション情報取得

ユーザーの現在のセッション情報を取得します。

**リクエスト**:
```
GET /api/auth/session
```

**レスポンス**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "ユーザー名"
  },
  "expires": "2023-12-31T23:59:59Z"
}
```

### 2.2 ログイン・ログアウト

Supabase Authを使用したGoogle OAuth認証を実装。フロントエンドから直接Supabase APIを呼び出します。

## 3. 記事管理API

### 3.1 記事一覧取得

公開済み記事の一覧をページネーション付きで取得します。

**リクエスト**:
```
GET /api/articles?page=1&limit=10
```

**レスポンス**:
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "記事タイトル",
      "author": {
        "id": "uuid",
        "name": "著者名"
      },
      "created_at": "2023-01-01T00:00:00Z"
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

### 3.2 記事詳細取得

記事IDを指定して詳細情報を取得します。公開記事または自分の記事のみアクセス可能です。

**リクエスト**:
```
GET /api/articles/[id]
```

**レスポンス**:
```json
{
  "id": "uuid",
  "title": "記事タイトル",
  "content": "記事本文（HTML形式）",
  "author": {
    "id": "uuid",
    "name": "著者名",
    "avatar_url": "https://..."
  },
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-02T00:00:00Z",
  "media": [...],
  "download_files": [...]
}
```

### 3.3 記事作成

新規記事を作成します。認証が必要です。

**リクエスト**:
```
POST /api/articles
Content-Type: application/json

{
  "title": "記事タイトル",
  "content": "記事本文",
  "status": "draft"
}
```

**レスポンス**:
```json
{
  "id": "新規作成された記事ID",
  "title": "記事タイトル",
  "status": "draft",
  "created_at": "2023-01-01T00:00:00Z"
}
```

### 3.4 記事更新

既存記事を更新します。自分の記事のみ更新可能です。

**リクエスト**:
```
PUT /api/articles/[id]
Content-Type: application/json

{
  "title": "更新後のタイトル",
  "content": "更新後の本文",
  "status": "published"
}
```

**レスポンス**:
```json
{
  "id": "記事ID",
  "title": "更新後のタイトル",
  "status": "published",
  "updated_at": "2023-01-02T00:00:00Z"
}
```

### 3.5 記事削除

記事を削除します。自分の記事のみ削除可能です。

**リクエスト**:
```
DELETE /api/articles/[id]
```

**レスポンス**:
```json
{
  "success": true,
  "message": "記事が削除されました"
}
```

## 4. メディア・ファイルAPI

### 4.1 メディアアップロード

記事内に埋め込む画像、動画、3Dモデルなどをアップロードします。

**リクエスト**:
```
POST /api/media/upload
Content-Type: multipart/form-data

{
  "file": [ファイルデータ],
  "articleId": "記事ID",
  "mediaType": "image"
}
```

**レスポンス**:
```json
{
  "id": "メディアID",
  "url": "https://...",
  "media_type": "image",
  "width": 800,
  "height": 600
}
```

### 4.2 ダウンロードファイルアップロード

記事からダウンロード可能なファイルをアップロードします。フォルダ構造も維持されます。

**リクエスト**:
```
POST /api/download_files/upload
Content-Type: multipart/form-data

{
  "file": [ファイルデータ],
  "articleId": "記事ID",
  "relativePath": "フォルダパス"
}
```

**レスポンス**:
```json
{
  "id": "ファイルID",
  "filename": "file.stl",
  "url": "https://...",
  "file_size": 1024,
  "file_type": "stl"
}
```

## 5. お気に入り機能API

### 5.1 お気に入り登録/解除

記事をお気に入りに登録または登録解除します。トグル動作です。

**リクエスト**:
```
POST /api/favorites/[articleId]
```

**レスポンス（登録時）**:
```json
{
  "favorited": true,
  "favorite_id": "uuid"
}
```

**レスポンス（解除時）**:
```json
{
  "favorited": false
}
```

### 5.2 お気に入り状態確認

記事が現在お気に入りに登録されているかを確認します。

**リクエスト**:
```
GET /api/favorites/[articleId]
```

**レスポンス**:
```json
{
  "favorited": true,
  "favorite_id": "uuid"
}
```

### 5.3 お気に入り一覧取得

ユーザーのお気に入り記事一覧を取得します。

**リクエスト**:
```
GET /api/favorites?page=1&limit=10
```

**レスポンス**:
```json
{
  "data": [
    {
      "id": "favorite_uuid",
      "created_at": "2023-01-01T00:00:00Z",
      "article": {
        "id": "article_uuid",
        "title": "記事タイトル",
        "author": {
          "name": "著者名"
        }
      }
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "total_pages": 3
  }
}
```

## 6. 統計API

### 6.1 閲覧数記録

記事の閲覧数をカウントアップします。

**リクエスト**:
```
POST /api/stats/view/[articleId]
```

**レスポンス**:
```json
{
  "success": true,
  "view_count": 42
}
```

### 6.2 ダウンロード数記録

記事のファイルダウンロード数をカウントアップします。

**リクエスト**:
```
POST /api/stats/download/[articleId]
```

**レスポンス**:
```json
{
  "success": true,
  "download_count": 15
}
```

## 7. エラー仕様

### 7.1 エラー応答フォーマット

すべてのAPIは統一されたエラーフォーマットを使用します。

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ"
  }
}
```

### 7.2 主なエラーコード

| HTTPステータス | エラーコード | 説明 |
| --- | --- | --- |
| 400 | INVALID_REQUEST | リクエスト形式が不正 |
| 401 | UNAUTHORIZED | 認証が必要 |
| 403 | FORBIDDEN | 権限不足 |
| 404 | NOT_FOUND | リソースが見つからない |
| 500 | SERVER_ERROR | サーバー内部エラー |

## 8. 最適化戦略

### 8.1 キャッシュ

- ISR (Incremental Static Regeneration)による静的コンテンツの定期更新
- SWRによるクライアントサイドキャッシュ
- 適切なCache-Controlヘッダーの設定

### 8.2 パフォーマンス

- クエリの最適化（必要なフィールドのみ選択）
- ページネーションの実装
- 適切なインデックスの活用
- 画像の最適化（WebP形式、遅延読み込み）