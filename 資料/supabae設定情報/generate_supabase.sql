-- カタマリプラットフォーム Supabase設定用SQLスクリプト
-- データベース詳細設計書に基づいて作成

-- エクステンション設定
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. テーブル定義の作成

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
  avatar_storage_bucket TEXT DEFAULT 'avatars',
  avatar_storage_path TEXT,
  role TEXT DEFAULT 'user', -- 'user', 'admin'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('user', 'admin'))
);

-- まずarticlesテーブルを外部キー制約なしで作成
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


-- 後からarticlesに外部キー制約を追加
ALTER TABLE articles
ADD CONSTRAINT fk_hero_image_id
FOREIGN KEY (hero_image_id) REFERENCES article_media(id) ON DELETE SET NULL;


-- download_filesテーブル
CREATE TABLE IF NOT EXISTS public.download_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);



-- tagsテーブル（タグマスター）
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE, -- URL用の正規化されたタグ名
  description TEXT,
  is_featured BOOLEAN DEFAULT FALSE, -- 注目タグかどうか
  count INTEGER DEFAULT 0, -- このタグを持つ記事数（キャッシュ）
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- article_tagsテーブル（記事とタグの関連付け）
CREATE TABLE IF NOT EXISTS public.article_tags (
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, tag_id)
);

-- 2. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_article_media_article_id ON article_media(article_id);
CREATE INDEX IF NOT EXISTS idx_article_media_type ON article_media(media_type);
CREATE INDEX IF NOT EXISTS idx_article_media_bucket ON article_media(storage_bucket);
CREATE INDEX IF NOT EXISTS idx_download_files_article_id ON download_files(article_id);
CREATE INDEX IF NOT EXISTS idx_download_files_type ON download_files(file_type);

-- 3. 全文検索のインデックス作成
CREATE INDEX IF NOT EXISTS idx_articles_title_trgm ON articles USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_articles_content_trgm ON articles USING GIN (content gin_trgm_ops);

-- 4. RLSを有効化
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_files ENABLE ROW LEVEL SECURITY;

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

-- 6. トリガー関数の作成

-- 認証トリガー関数
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'User'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    avatar_url = EXCLUDED.avatar_url,
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

-- 8. ストレージバケットの作成
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'ユーザーアバター', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('article_media', '記事内メディア（画像・動画・3Dモデル）', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('downloads', 'ダウンロード用ファイル', true);


-- 9. ストレージのRLSポリシー設定
-- avatarsバケットのRLSポリシー
CREATE POLICY "アバターは全ユーザーが閲覧可能" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars'
  );

CREATE POLICY "ユーザーは自分のアバターのみアップロード可能" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "ユーザーは自分のアバターのみ更新可能" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "ユーザーは自分のアバターのみ削除可能" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- article_mediaバケットのRLSポリシー
CREATE POLICY "公開記事のメディアは全ユーザーが閲覧可能" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'article_media' AND (
      EXISTS (
        SELECT 1 FROM articles a
        WHERE a.id::text = (storage.foldername(name))[2]
        AND (a.status = 'published' OR a.author_id = auth.uid())
      )
    )
  );

CREATE POLICY "ユーザーは自分の記事のメディアのみアップロード可能" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'article_media' AND (
      EXISTS (
        SELECT 1 FROM articles a
        WHERE a.id::text = (storage.foldername(name))[2]
        AND a.author_id = auth.uid()
      )
    )
  );

CREATE POLICY "ユーザーは自分の記事のメディアのみ更新可能" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'article_media' AND (
      EXISTS (
        SELECT 1 FROM articles a
        WHERE a.id::text = (storage.foldername(name))[2]
        AND a.author_id = auth.uid()
      )
    )
  );

CREATE POLICY "ユーザーは自分の記事のメディアのみ削除可能" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'article_media' AND (
      EXISTS (
        SELECT 1 FROM articles a
        WHERE a.id::text = (storage.foldername(name))[2]
        AND a.author_id = auth.uid()
      )
    )
  );

-- downloadsバケットのRLSポリシー
CREATE POLICY "公開記事のダウンロードファイルは全ユーザーが閲覧可能" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'downloads' AND (
      EXISTS (
        SELECT 1 FROM articles a
        WHERE a.id::text = (storage.foldername(name))[2]
        AND (a.status = 'published' OR a.author_id = auth.uid())
      )
    )
  );

CREATE POLICY "download_files_select_policy" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'downloads' AND (
      EXISTS (
        SELECT 1 FROM articles a
        WHERE a.id::text = (storage.foldername(name))[2]
        AND (a.status = 'published' OR a.author_id = auth.uid())
      )
    )
  );

CREATE POLICY "download_files_update_policy" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'downloads' AND (
      EXISTS (
        SELECT 1 FROM articles a
        WHERE a.id::text = (storage.foldername(name))[2]
        AND a.author_id = auth.uid()
      )
    )
  );

CREATE POLICY "download_files_delete_policy" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'downloads' AND (
      EXISTS (
        SELECT 1 FROM articles a
        WHERE a.id::text = (storage.foldername(name))[2]
        AND a.author_id = auth.uid()
      )
    )
  );