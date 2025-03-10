-- ビューカウントやダウンロードカウントをインクリメントするための関数
CREATE OR REPLACE FUNCTION increment(field_name text)
RETURNS int AS $$
BEGIN
  RETURN field_name + 1;
END;
$$ LANGUAGE plpgsql;

-- 記事のビューカウントをインクリメントするための関数
CREATE OR REPLACE FUNCTION increment_view_count(article_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE articles 
  SET view_count = view_count + 1 
  WHERE id = article_id;
END;
$$ LANGUAGE plpgsql; 