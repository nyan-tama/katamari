-- カタマリプラットフォーム Supabase設定用SQLスクリプト
-- データベース詳細設計書に基づいて作成

-- 1. エクステンション設定
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. テーブル定義の作成

-- usersテーブル
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  bio TEXT, -- 自己紹介文
  website_url1 TEXT, -- 個人サイトなど
  website_url2 TEXT, -- ポートフォリオなど
  website_url3 TEXT, -- その他のウェブサイト
  twitter_url TEXT, -- Twitter/X
  instagram_url TEXT, -- Instagram
  facebook_url TEXT, -- Facebook
  tiktok_url TEXT, -- TikTok
  github_url TEXT, -- GitHub
  default_avatar_url TEXT, -- Google認証から取得したデフォルトアバターURL
  avatar_storage_bucket TEXT DEFAULT 'avatars', -- カスタムアバター用のバケット
  avatar_storage_path TEXT, -- カスタムアバターのパス
  role TEXT DEFAULT 'user', -- 'user', 'admin'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('user', 'admin'))
);

-- articlesテーブル
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  hero_image_id UUID, -- 外部キー制約なし
  status TEXT NOT NULL DEFAULT 'draft',
  view_count INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  has_3d_model BOOLEAN DEFAULT TRUE,
  content_format TEXT DEFAULT 'tiptap_v1',
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'published'))
);

-- article_mediaテーブル
CREATE TABLE IF NOT EXISTS public.article_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL,
  file_extension TEXT, -- 追加: 'jpg', 'png', 'webp', 'mp4', 'stl'などの拡張子
  processing_status TEXT DEFAULT 'pending', -- 追加: 'pending', 'processing', 'completed', 'error'
  parent_media_id UUID REFERENCES article_media(id), -- 追加: バリエーション元の画像ID
  variant_type TEXT, -- 追加: 'w300', 'w600', 'thumbnail'などのバリエーション種別
  storage_bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  alt_text TEXT,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  media_role TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_media_type CHECK (media_type IN ('image', 'video', 'model')),
  CONSTRAINT valid_media_role CHECK (media_role IS NULL OR media_role IN ('hero', 'content')),
  CONSTRAINT valid_media_type_role CHECK (
    (media_type = 'model' AND (media_role IS NULL OR media_role = 'content')) OR
    (media_type IN ('image', 'video'))
  ),
  CONSTRAINT valid_processing_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'error'))
);

-- article_metadataテーブル（運営側SEO最適化用 AIで生成したデータを保存するテーブル）
CREATE TABLE IF NOT EXISTS public.article_metadata (
  article_id UUID PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
  meta_title TEXT, -- SEO用に最適化されたタイトル
  meta_description TEXT, -- SEO用の説明文
  ai_generated_tags TEXT[], -- AI生成のタグ配列
  ai_generated_summary TEXT, -- AI生成の要約
  structured_data JSONB, -- 追加: JSON-LD形式の構造化データ
  seo_aspects JSONB, -- 追加: カテゴリ別の詳細SEOスコア
  seo_score INTEGER, -- 総合SEO評価スコア
  indexing_control TEXT DEFAULT 'index,follow', -- 追加: 'noindex,follow', 'index,nofollow', 'noindex,nofollow'
  last_ai_analysis TIMESTAMP WITH TIME ZONE, -- 最後にAI分析した日時
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_indexing_control CHECK (indexing_control IN ('index,follow', 'noindex,follow', 'index,nofollow', 'noindex,nofollow'))
);

-- download_filesテーブル
CREATE TABLE IF NOT EXISTS public.download_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- favoritesテーブル（お気に入り機能用）
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, article_id)
);

-- 3. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON articles(author_id);
CREATE INDEX IF NOT EXISTS idx_article_media_article_id ON article_media(article_id);
CREATE INDEX IF NOT EXISTS idx_article_media_type ON article_media(media_type);
CREATE INDEX IF NOT EXISTS idx_download_files_article_id ON download_files(article_id);
CREATE INDEX IF NOT EXISTS idx_download_files_type ON download_files(file_type);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_article_id ON favorites(article_id);

-- 4. RLSを有効化
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- 5. RLSポリシー設定

-- usersテーブルのRLSポリシー
CREATE POLICY "ユーザー情報は全体に公開" ON users
  FOR SELECT USING (true);

CREATE POLICY "自分のプロフィールのみ更新可能" ON users
  FOR UPDATE USING (auth.uid() = id);

-- articlesテーブルのRLSポリシー
CREATE POLICY "公開記事は全体に公開" ON articles
  FOR SELECT USING (status = 'published' OR auth.uid() = author_id);

CREATE POLICY "ユーザーは自分の記事のみ投稿可能" ON articles
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "自分の記事のみ更新可能" ON articles
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "自分の記事のみ削除可能" ON articles
  FOR DELETE USING (auth.uid() = author_id);

-- article_mediaテーブルのRLSポリシー
CREATE POLICY "Media items are viewable by everyone" 
ON public.article_media FOR SELECT USING (true);

CREATE POLICY "Media items can be inserted by the article owner" 
ON public.article_media FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.articles 
    WHERE id = article_id AND author_id = auth.uid()
  )
);

CREATE POLICY "Media items can only be updated by the article owner" 
ON public.article_media FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.articles 
    WHERE id = article_id AND author_id = auth.uid()
  )
);

CREATE POLICY "Media items can only be deleted by the article owner" 
ON public.article_media FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.articles 
    WHERE id = article_id AND author_id = auth.uid()
  )
);

-- article_metadataテーブルのRLSポリシー
CREATE POLICY "メタデータは記事に準じる" ON article_metadata
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_id
      AND (articles.status = 'published' OR articles.author_id = auth.uid())
    )
  );

CREATE POLICY "メタデータは記事所有者のみ編集可能" ON article_metadata
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_id
      AND articles.author_id = auth.uid()
    )
  );

-- download_filesテーブルのRLSポリシー
CREATE POLICY "公開記事のファイルは全体に公開" ON download_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_id
      AND (articles.status = 'published' OR articles.author_id = auth.uid())
    )
  );

CREATE POLICY "自分の記事のファイルのみ追加可能" ON download_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_id
      AND articles.author_id = auth.uid()
    )
  );

CREATE POLICY "自分の記事のファイルのみ更新可能" ON download_files
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_id
      AND articles.author_id = auth.uid()
    )
  );

CREATE POLICY "自分の記事のファイルのみ削除可能" ON download_files
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_id
      AND articles.author_id = auth.uid()
    )
  );

-- favoritesテーブルのRLSポリシー
CREATE POLICY "お気に入りはユーザーに準じる" ON favorites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = favorites.user_id
    )
  );

CREATE POLICY "お気に入りは記事に準じる" ON favorites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = favorites.article_id
    )
  );

CREATE POLICY "お気に入りはユーザーのみ追加可能" ON favorites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = favorites.user_id
    )
  );

CREATE POLICY "お気に入りはユーザーのみ削除可能" ON favorites
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = favorites.user_id
    )
  );

-- 6. トリガー関数の作成

-- 認証トリガー関数
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    email, 
    name,
    avatar_storage_bucket,
    avatar_storage_path,
    default_avatar_url
  )
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'User'),
    'avatars',
    NULL,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    default_avatar_url = EXCLUDED.default_avatar_url,
    updated_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 更新日時自動更新トリガー関数
CREATE OR REPLACE FUNCTION public.update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. トリガーの設定

-- 認証トリガー
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 更新日時自動更新トリガー
CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER article_media_updated_at
  BEFORE UPDATE ON article_media
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER article_metadata_updated_at
  BEFORE UPDATE ON article_metadata
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER download_files_updated_at
  BEFORE UPDATE ON download_files
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER favorites_updated_at
  BEFORE UPDATE ON favorites
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- 8. ストレージバケットの作成
INSERT INTO storage.buckets (id, name, public) VALUES ('articles', '記事に添付するファイル一式', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'ユーザーアバター画像', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('article_media', '記事内に埋め込むメディアファイル', true);

-- 9. ストレージのRLSポリシー設定

-- articlesバケットのRLSポリシー
CREATE POLICY "公開記事のファイルは閲覧可能" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'articles' AND (
      EXISTS (
        SELECT 1 FROM articles a
        WHERE a.id::text = (storage.foldername(name))[2]
        AND a.status = 'published'
      )
    )
  );

CREATE POLICY "自分の記事のファイルは閲覧可能" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'articles' AND (
      EXISTS (
        SELECT 1 FROM articles a
        WHERE a.id::text = (storage.foldername(name))[2]
        AND a.author_id = auth.uid()
      )
    )
  );

CREATE POLICY "自分の記事のファイルのみアップロード可能" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'articles' AND (
      EXISTS (
        SELECT 1 FROM articles a
        WHERE a.id::text = (storage.foldername(name))[2]
        AND a.author_id = auth.uid()
      )
    )
  );

CREATE POLICY "自分の記事のファイルのみ削除可能" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'articles' AND (
      EXISTS (
        SELECT 1 FROM articles a
        WHERE a.id::text = (storage.foldername(name))[2]
        AND a.author_id = auth.uid()
      )
    )
  );

-- article_mediaバケットのRLSポリシー
CREATE POLICY "メディアは公開で読み取り可能" ON storage.objects
  FOR SELECT USING (bucket_id = 'article_media');

CREATE POLICY "認証済みユーザーはメディアをアップロード可能" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'article_media' AND auth.uid() = (storage.foldername(name))[1]::uuid);

CREATE POLICY "ユーザーは自分のメディアのみ削除可能" ON storage.objects
  FOR DELETE USING (bucket_id = 'article_media' AND auth.uid() = (storage.foldername(name))[1]::uuid);

-- avatarsバケットのRLSポリシー
CREATE POLICY "アバターは公開で読み取り可能" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "認証済みユーザーはアバターをアップロード可能" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid);

CREATE POLICY "ユーザーは自分のアバターのみ削除可能" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid);

-- 10. 全文検索関数の作成
CREATE OR REPLACE FUNCTION search_articles(search_term TEXT)
RETURNS SETOF articles AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM articles
  WHERE status = 'published' AND
    (title ILIKE '%' || search_term || '%'
     OR content ILIKE '%' || search_term || '%')
  ORDER BY 
    CASE 
      WHEN title ILIKE search_term THEN 0
      WHEN title ILIKE search_term || '%' THEN 1
      WHEN title ILIKE '%' || search_term || '%' THEN 2
      ELSE 3
    END,
    created_at DESC;
END;
$$ LANGUAGE plpgsql; 