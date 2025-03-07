-- Supabase設定再現用SQLファイル
-- 以下のコマンドを実行し、各CSVファイルからSQL生成スクリプトを作成

-- 1. テーブル定義の生成
WITH tables AS (
  SELECT DISTINCT table_name 
  FROM '資料/supabae設定情報/5.テーブル列定義結果.csv'
)
SELECT 
  'CREATE TABLE IF NOT EXISTS public.' || quote_ident(t.table_name) || ' (' ||
  string_agg(
    quote_ident(c.column_name) || ' ' || 
    c.data_type || 
    CASE WHEN c.character_maximum_length IS NOT NULL 
         THEN '(' || c.character_maximum_length || ')' 
         ELSE '' END || 
    CASE WHEN c.column_default IS NOT NULL 
         THEN ' DEFAULT ' || c.column_default
         ELSE '' END ||
    CASE WHEN c.is_nullable = 'NO' 
         THEN ' NOT NULL' 
         ELSE '' END,
    ', '
  ) || ');'
FROM tables t
JOIN '資料/supabae設定情報/5.テーブル列定義結果.csv' c ON t.table_name = c.table_name
GROUP BY t.table_name;

-- 2. インデックス定義の生成
SELECT 
  'CREATE INDEX IF NOT EXISTS ' || quote_ident(index_name) || 
  ' ON public.' || quote_ident(table_name) || 
  ' (' || column_names || ');'
FROM '資料/supabae設定情報/3.テーブルインデックス結果.csv'
WHERE index_name NOT LIKE '%_pkey';

-- 3. プライマリキー制約の生成
SELECT 
  'ALTER TABLE public.' || quote_ident(table_name) || 
  ' ADD PRIMARY KEY (' || column_names || ');'
FROM '資料/supabae設定情報/3.テーブルインデックス結果.csv'
WHERE index_name LIKE '%_pkey';

-- 4. 関数定義の生成
SELECT definition
FROM '資料/supabae設定情報/4.テーブルファンクション結果.csv'
WHERE name = 'handle_new_user' OR name = 'update_timestamp_column';

-- 5. トリガー定義の生成（RI_Constraintトリガーは除外）
SELECT trigger_definition || ';'
FROM '資料/supabae設定情報/6.テーブルトリガー結果.csv'
WHERE trigger_name NOT LIKE 'RI_ConstraintTrigger%';

-- 6. RLSポリシーの有効化
SELECT 
  'ALTER TABLE public.' || quote_ident(tablename) || 
  ' ENABLE ROW LEVEL SECURITY;'
FROM '資料/supabae設定情報/1.テーブル結果.csv'
WHERE rowsecurity = 'true' AND 
      tablename IN (SELECT DISTINCT table_name FROM '資料/supabae設定情報/5.テーブル列定義結果.csv');

-- 7. RLSポリシーの生成
SELECT 
  CASE 
    WHEN cmd = 'SELECT' THEN 
      'CREATE POLICY ' || quote_literal(policyname) || 
      ' ON public.' || quote_ident(tablename) || 
      ' FOR SELECT USING (' || qual || ');'
    WHEN cmd = 'INSERT' THEN
      'CREATE POLICY ' || quote_literal(policyname) || 
      ' ON public.' || quote_ident(tablename) || 
      ' FOR INSERT WITH CHECK (' || with_check || ');'
    WHEN cmd = 'UPDATE' THEN
      'CREATE POLICY ' || quote_literal(policyname) || 
      ' ON public.' || quote_ident(tablename) || 
      ' FOR UPDATE USING (' || qual || ');'
    WHEN cmd = 'DELETE' THEN
      'CREATE POLICY ' || quote_literal(policyname) || 
      ' ON public.' || quote_ident(tablename) || 
      ' FOR DELETE USING (' || qual || ');'
  END
FROM '資料/supabae設定情報/2.テーブルポリシー結果.csv';

-- 8. ストレージバケットの生成
SELECT 
  'INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(name) || ', ' ||
  public || ', ' ||
  file_size_limit || ', ' ||
  COALESCE(quote_literal(allowed_mime_types), 'NULL') || ');'
FROM '資料/supabae設定情報/7.ストレージ結果.csv';

-- 9. ストレージRLSポリシーの生成
\i sql/storage_rls_policies.sql 