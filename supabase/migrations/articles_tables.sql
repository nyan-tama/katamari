-- 記事テーブル
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  summary TEXT,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  category_id UUID REFERENCES categories(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0
);

-- RLS（行レベルセキュリティ）の設定
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- 記事閲覧ポリシー（公開記事はだれでも閲覧可能）
CREATE POLICY "公開記事は誰でも閲覧可能" 
  ON articles FOR SELECT 
  USING (status = 'published' OR auth.uid() = user_id);

-- 記事作成ポリシー（認証済みユーザーのみ作成可能）
CREATE POLICY "認証済みユーザーは記事作成可能" 
  ON articles FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

-- 記事更新ポリシー（作成者のみ更新可能）
CREATE POLICY "作成者のみ記事更新可能" 
  ON articles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- 記事削除ポリシー（作成者のみ削除可能）
CREATE POLICY "作成者のみ記事削除可能" 
  ON articles FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- 記事とタグの関連付けテーブル
CREATE TABLE article_tags (
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- 記事と3Dモデルの関連付けテーブル
CREATE TABLE article_models (
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  model_id UUID REFERENCES models(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, model_id)
);

-- トリガー：更新時にupdated_atを現在時刻に設定
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_articles_updated_at
BEFORE UPDATE ON articles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at(); 