# カタワク Supabase SQL 設定ファイル

このディレクトリには、Supabaseのデータベース設定に関するSQLファイルが含まれています。

## ファイル一覧

### database_setup.sql
全体のデータベース設定が含まれた包括的なSQLファイルです。以下の設定が含まれています：
- テーブル作成（users, models）
- インデックス設定
- 更新日時自動更新トリガー
- ユーザー自動作成トリガー
- RLS（Row Level Security）ポリシー
- ストレージバケット設定

### create_user_trigger.sql
Supabase Authで認証されたユーザーを自動的にusersテーブルに登録するトリガー関数を定義しています。

### fix_trigger.sql
create_user_triggerの修正バージョンです。GoogleOAuthなどの外部認証プロバイダ対応が改善されています。

### create_avatar_bucket.sql
ユーザーのアバター画像を保存するためのストレージバケットを作成し、適切なセキュリティポリシーを設定します。

### user_rls_policy.sql
usersテーブルに対するRLS（Row Level Security）ポリシーを定義しています。誰でもユーザー情報を閲覧できますが、更新は本人のみに制限されています。

## 使用方法

これらのSQLファイルは、Supabase管理画面のSQLエディタで実行するか、APIを通じて実行することができます。
新しい環境をセットアップする場合は、まず`database_setup.sql`を実行することをお勧めします。

**注意**: 既存のデータベースに適用する場合は、テーブルやポリシーが既に存在しないことを確認してください。 