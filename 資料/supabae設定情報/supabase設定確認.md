-- 1. テーブル一覧の確認
SELECT 
  n.nspname AS schemaname,
  c.relname AS tablename,
  CASE WHEN c.relrowsecurity THEN 'true' ELSE 'false' END AS rowsecurity,
  a.rolname AS tableowner
FROM 
  pg_class c
JOIN 
  pg_namespace n ON c.relnamespace = n.oid
JOIN 
  pg_authid a ON c.relowner = a.oid
WHERE 
  c.relkind = 'r' AND 
  n.nspname IN ('public', 'auth', 'storage')
ORDER BY 
  n.nspname, c.relname;

-- 2. ストレージバケットの確認
SELECT 
  id, 
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
FROM 
  storage.buckets
ORDER BY 
  created_at;

-- 3. すべてのテーブルポリシーの確認
SELECT
  tab.relname AS table_name,
  pol.polname AS policy_name,
  CASE
    WHEN pol.polcmd = 'r' THEN 'SELECT'
    WHEN pol.polcmd = 'a' THEN 'INSERT'
    WHEN pol.polcmd = 'w' THEN 'UPDATE'
    WHEN pol.polcmd = 'd' THEN 'DELETE'
    WHEN pol.polcmd = '*' THEN 'ALL'
  END AS command,
  pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM
  pg_policy pol
JOIN
  pg_class tab ON pol.polrelid = tab.oid
JOIN
  pg_namespace n ON tab.relnamespace = n.oid
WHERE
  n.nspname = 'public'
ORDER BY
  tab.relname, pol.polname;

-- 4. ストレージポリシーの確認
SELECT
  pol.polname AS policy_name,
  tab.relname AS table_name,
  CASE
    WHEN pol.polcmd = 'r' THEN 'SELECT'
    WHEN pol.polcmd = 'a' THEN 'INSERT'
    WHEN pol.polcmd = 'w' THEN 'UPDATE'
    WHEN pol.polcmd = 'd' THEN 'DELETE'
    WHEN pol.polcmd = '*' THEN 'ALL'
  END AS command,
  pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM
  pg_policy pol
JOIN
  pg_class tab ON pol.polrelid = tab.oid
WHERE
  tab.relname = 'objects' AND tab.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'storage')
ORDER BY
  policy_name;


-- 5. テーブルインデックスの確認
SELECT
  i.relname AS index_name,
  t.relname AS table_name,
  array_to_string(array_agg(a.attname ORDER BY k.indnatts), ', ') AS column_names
FROM
  pg_index k
JOIN
  pg_class i ON i.oid = k.indexrelid
JOIN
  pg_class t ON t.oid = k.indrelid
JOIN
  pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(k.indkey)
WHERE
  t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
GROUP BY
  i.relname, t.relname
ORDER BY
  t.relname, i.relname;



-- 6. 関数の確認
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM
  pg_proc p
JOIN
  pg_namespace n ON p.pronamespace = n.oid
WHERE
  n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY
  schema_name, function_name;


-- 7. トリガーの確認
SELECT
  trig.tgname AS trigger_name,
  tab.relname AS table_name,
  pg_get_triggerdef(trig.oid) AS trigger_definition
FROM
  pg_trigger trig
JOIN
  pg_class tab ON trig.tgrelid = tab.oid
WHERE
  tab.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND NOT trig.tgisinternal
ORDER BY
  tab.relname, trig.tgname;


-- 8. テーブルの列情報の確認
SELECT
  t.table_name,
  c.column_name,
  c.data_type,
  c.column_default,
  c.is_nullable,
  c.character_maximum_length
FROM
  information_schema.tables t
JOIN
  information_schema.columns c ON t.table_name = c.table_name
WHERE
  t.table_schema = 'public'
  AND c.table_schema = 'public'
ORDER BY
  t.table_name, c.ordinal_position;


-- 9. 外部キー制約の確認
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  rc.update_rule
FROM
  information_schema.table_constraints tc
JOIN
  information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN
  information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
JOIN
  information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
WHERE
  tc.constraint_type = 'FOREIGN KEY'