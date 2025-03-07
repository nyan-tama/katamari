
## テーブル定義確認
SELECT 
  tablename,
  rowsecurity
FROM 
  pg_tables;

## ポリシーの確認
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM
  pg_policies
WHERE
  schemaname = 'public'
ORDER BY
  tablename, policyname;


## インデックス確認
SELECT 
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public'
ORDER BY 
  table_schema, 
  table_name, 
  ordinal_position;

-- インデックス定義を取得
SELECT
  i.relname as index_name,
  t.relname as table_name,
  array_to_string(array_agg(a.attname), ', ') as column_names
FROM
  pg_class t,
  pg_class i,
  pg_index ix,
  pg_attribute a
WHERE
  t.oid = ix.indrelid
  and i.oid = ix.indexrelid
  and a.attrelid = t.oid
  and a.attnum = ANY(ix.indkey)
  and t.relkind = 'r'
  and t.relnamespace in (select oid from pg_namespace where nspname = 'public')
GROUP BY
  i.relname,
  t.relname
ORDER BY
  t.relname,
  i.relname;

## 関数の定義を確認
SELECT
  n.nspname as schema,
  p.proname as name,
  pg_get_functiondef(p.oid) as definition
FROM
  pg_proc p
  LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE
  n.nspname = 'public'
ORDER BY
  schema, name;


## テーブルの列定義詳細
SELECT 
  table_name,
  column_name,
  data_type,
  character_maximum_length,
  column_default,
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public'
ORDER BY 
  table_name, ordinal_position;


## トリガー情報
SELECT
  tgname AS trigger_name,
  relname AS table_name,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM
  pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE
  n.nspname = 'public';


## ストレージバケットの情報
SELECT * FROM storage.buckets;


## ストレージポリシーの確認
SELECT
  n.nspname as schema,
  p.proname as name,
  pg_get_functiondef(p.oid) as definition
FROM
  pg_proc p
  LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE
  n.nspname = 'storage'
  OR p.proname LIKE '%policy%'
  OR p.proname LIKE '%bucket%'
ORDER BY
  schema, name;