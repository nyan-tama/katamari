# 本番環境設定メモ

## Vercel環境変数

以下の環境変数がVercelダッシュボードに設定されています：

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase プロジェクトURL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase 匿名キー
- `NEXT_PUBLIC_SITE_URL`: サイトのベースURL (https://katamari.jp)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase サービスロールキー（高権限）
- `NEXT_PUBLIC_GA_ID`: Google Analytics 測定ID

## 設定場所

1. Vercel: https://vercel.com/your-account/your-project/settings/environment-variables
2. Supabase: https://app.supabase.com/project/your-project/settings/api
3. Google Analytics: https://analytics.google.com/analytics/web/

## 環境変数の更新手順

1. ローカルでテスト
2. Vercelダッシュボードで更新
3. 必要に応じて再デプロイ 