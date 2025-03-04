-- =====================================================
-- カタワク データベース設定
-- =====================================================

-- テーブル設定
-- =====================================================

-- usersテーブル作成
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- modelsテーブル作成
CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス作成
CREATE INDEX idx_models_user_id ON models(user_id);
CREATE INDEX idx_models_created_at ON models(created_at);

-- 更新日時を自動更新する関数とトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_models_updated_at
BEFORE UPDATE ON models
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ユーザー自動作成トリガー
-- =====================================================

-- auth.usersからpublic.usersへのトリガー関数
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
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

-- トリガーの作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user(); 

-- RLS（Row Level Security）ポリシー
-- =====================================================

-- usersテーブルのRLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- usersテーブルのポリシー
-- 全てのユーザー情報は誰でも閲覧可能
CREATE POLICY "ユーザーの閲覧は全体に公開" ON users
    FOR SELECT USING (true);

-- 自分のプロフィールのみ更新可能
CREATE POLICY "自分のプロフィールのみ更新可能" ON users
    FOR UPDATE USING (auth.uid() = id);

-- modelsテーブルのRLSを有効化
ALTER TABLE models ENABLE ROW LEVEL SECURITY;

-- modelsテーブルのポリシー
-- 全てのモデルは誰でも閲覧可能
CREATE POLICY "モデルの閲覧は全体に公開" ON models
    FOR SELECT USING (true);

-- 認証済みユーザーのみモデル追加可能
CREATE POLICY "認証済みユーザーのみモデル追加可能" ON models
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 自分のモデルのみ更新可能
CREATE POLICY "自分のモデルのみ更新可能" ON models
    FOR UPDATE USING (auth.uid() = user_id);

-- 自分のモデルのみ削除可能
CREATE POLICY "自分のモデルのみ削除可能" ON models
    FOR DELETE USING (auth.uid() = user_id);

-- ストレージバケット設定
-- =====================================================

-- モデルファイル用のバケット作成（公開バケット）
INSERT INTO storage.buckets (id, name, public)
VALUES ('model_files', 'model_files', true);

-- サムネイル画像用のバケット作成（公開バケット）
INSERT INTO storage.buckets (id, name, public)
VALUES ('model_thumbnails', 'model_thumbnails', true);

-- アバター画像用のバケット作成（公開バケット）
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- ストレージのRLSポリシー
-- 閲覧はすべてのユーザーに許可
CREATE POLICY "モデルファイルは全体に公開" ON storage.objects
    FOR SELECT USING (bucket_id = 'model_files');

CREATE POLICY "サムネイルは全体に公開" ON storage.objects
    FOR SELECT USING (bucket_id = 'model_thumbnails');

CREATE POLICY "アバターは全体に公開" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

-- アップロードは認証済みユーザーのみ許可
CREATE POLICY "認証済みユーザーのみモデルファイルのアップロード可能" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'model_files' AND
        auth.role() = 'authenticated' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "認証済みユーザーのみサムネイルのアップロード可能" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'model_thumbnails' AND
        auth.role() = 'authenticated' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "認証済みユーザーのみアバターのアップロード可能" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND
        auth.role() = 'authenticated' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- 削除は所有者のみ許可
CREATE POLICY "所有者のみモデルファイルの削除可能" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'model_files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "所有者のみサムネイルの削除可能" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'model_thumbnails' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "所有者のみアバターの削除可能" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    ); 