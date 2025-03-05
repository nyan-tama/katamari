-- auth.usersからpublic.usersへのトリガー関数
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  avatar_url_value TEXT;
BEGIN
  -- avatar_urlの処理
  avatar_url_value := NEW.raw_user_meta_data->>'avatar_url';
  
  -- NULL以外の場合のみ処理
  IF avatar_url_value IS NOT NULL THEN
    -- ここでURLの処理は行わず、そのまま保存
    -- クライアント側で適切に処理する
    NULL;
  END IF;

  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'User'),
    avatar_url_value
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    avatar_url = avatar_url_value,
    updated_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーの作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user(); 