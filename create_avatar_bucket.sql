-- アバター画像用のバケット作成（公開バケット）
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- アバター用ストレージのRLSポリシー
-- 閲覧はすべてのユーザーに許可
CREATE POLICY "アバター画像は全体に公開" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

-- アップロードは所有者のみ許可
CREATE POLICY "所有者のみアバター画像のアップロード可能" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND
        auth.role() = 'authenticated' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- 削除は所有者のみ許可
CREATE POLICY "所有者のみアバター画像の削除可能" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    ); 