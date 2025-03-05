-- 1. まずテストユーザー10人を作成（すべて同じアバターURLを使用）
INSERT INTO users (
  id,
  email,
  name,
  avatar_url,
  created_at,
  updated_at
)
VALUES
  ('11111111-1111-1111-1111-111111111101', 'test-user-01@example.com', 'テストユーザー01', 'https://lh3.googleusercontent.com/a/ACg8ocJs50Gcb0Lcou8V48npVIRxwSayf5orcFXmlLN6RM4_zDgyDA=s96-c', now(), now()),
  ('11111111-1111-1111-1111-111111111102', 'test-user-02@example.com', 'テストユーザー02', 'https://lh3.googleusercontent.com/a/ACg8ocJs50Gcb0Lcou8V48npVIRxwSayf5orcFXmlLN6RM4_zDgyDA=s96-c', now(), now()),
  ('11111111-1111-1111-1111-111111111103', 'test-user-03@example.com', 'テストユーザー03', 'https://lh3.googleusercontent.com/a/ACg8ocJs50Gcb0Lcou8V48npVIRxwSayf5orcFXmlLN6RM4_zDgyDA=s96-c', now(), now()),
  ('11111111-1111-1111-1111-111111111104', 'test-user-04@example.com', 'テストユーザー04', 'https://lh3.googleusercontent.com/a/ACg8ocJs50Gcb0Lcou8V48npVIRxwSayf5orcFXmlLN6RM4_zDgyDA=s96-c', now(), now()),
  ('11111111-1111-1111-1111-111111111105', 'test-user-05@example.com', 'テストユーザー05', 'https://lh3.googleusercontent.com/a/ACg8ocJs50Gcb0Lcou8V48npVIRxwSayf5orcFXmlLN6RM4_zDgyDA=s96-c', now(), now()),
  ('11111111-1111-1111-1111-111111111106', 'test-user-06@example.com', 'テストユーザー06', 'https://lh3.googleusercontent.com/a/ACg8ocJs50Gcb0Lcou8V48npVIRxwSayf5orcFXmlLN6RM4_zDgyDA=s96-c', now(), now()),
  ('11111111-1111-1111-1111-111111111107', 'test-user-07@example.com', 'テストユーザー07', 'https://lh3.googleusercontent.com/a/ACg8ocJs50Gcb0Lcou8V48npVIRxwSayf5orcFXmlLN6RM4_zDgyDA=s96-c', now(), now()),
  ('11111111-1111-1111-1111-111111111108', 'test-user-08@example.com', 'テストユーザー08', 'https://lh3.googleusercontent.com/a/ACg8ocJs50Gcb0Lcou8V48npVIRxwSayf5orcFXmlLN6RM4_zDgyDA=s96-c', now(), now()),
  ('11111111-1111-1111-1111-111111111109', 'test-user-09@example.com', 'テストユーザー09', 'https://lh3.googleusercontent.com/a/ACg8ocJs50Gcb0Lcou8V48npVIRxwSayf5orcFXmlLN6RM4_zDgyDA=s96-c', now(), now()),
  ('11111111-1111-1111-1111-111111111110', 'test-user-10@example.com', 'テストユーザー10', 'https://lh3.googleusercontent.com/a/ACg8ocJs50Gcb0Lcou8V48npVIRxwSayf5orcFXmlLN6RM4_zDgyDA=s96-c', now(), now());

-- 2. 次に100件のモデルデータを一気に作成
WITH model_data AS (
  SELECT 
    gen_random_uuid() AS id,
    i,
    CASE 
      WHEN i % 5 = 1 THEN 'キャラクターモデル'
      WHEN i % 5 = 2 THEN '建築モデル'
      WHEN i % 5 = 3 THEN '風景モデル'
      WHEN i % 5 = 4 THEN '乗り物モデル'
      ELSE 'アイテムモデル'
    END || i AS title,
    CASE 
      WHEN i % 3 = 0 THEN '詳細な説明文をここに入れます。このモデルは様々な用途に使えます。'
      WHEN i % 3 = 1 THEN 'サンプル用のモデルデータです。テスト目的で作成されました。'
      ELSE 'このモデルの特徴は独特なスタイルと細部の作り込みです。'
    END AS description,
    'test_data/thumbnail' || (((i - 1) % 5) + 1) || '.jpg' AS thumbnail_url,
    'test_data/model1.stl' AS file_url,
    '11111111-1111-1111-1111-1111111111' || LPAD((((i - 1) % 10) + 1)::text, 2, '0') AS user_id,
    now() - (i || ' hours')::interval AS created_at,
    now() - (i || ' hours')::interval AS updated_at
  FROM generate_series(1, 100) AS i
)
INSERT INTO models (
  id, 
  title, 
  description, 
  thumbnail_url, 
  file_url, 
  user_id, 
  created_at, 
  updated_at
)
SELECT 
  id,
  title,
  description,
  thumbnail_url,
  file_url,
  user_id::uuid,
  created_at,
  updated_at
FROM model_data;