-- usersテーブルのRLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- SELECT（読み取り）ポリシー: すべてのユーザー情報は誰でも閲覧可能
CREATE POLICY "ユーザーの閲覧は全体に公開" ON users
    FOR SELECT USING (true);

-- UPDATE（更新）ポリシー: 自分のプロフィールのみ更新可能
CREATE POLICY "自分のプロフィールのみ更新可能" ON users
    FOR UPDATE USING (auth.uid() = id);

-- DELETE（削除）ポリシー: 自分のアカウントのみ削除可能
CREATE POLICY "自分のアカウントのみ削除可能" ON users
    FOR DELETE USING (auth.uid() = id); 