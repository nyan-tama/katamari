import { createClient } from '@supabase/supabase-js'
import { createClientSupabase } from '@/lib/supabase-client'
import { generateIdAndSlug, generateSlugFromId } from '@/app/utils/slugGenerator'

// 記事の型定義
export interface Article {
  id: string
  author_id: string
  title: string
  content: string
  hero_image_url?: string
  hero_image_id?: string
  status: 'draft' | 'published'
  view_count: number
  download_count: number
  created_at: string
  updated_at: string
  slug: string
}

// 記事作成用の型定義
export interface CreateArticleInput {
  title: string
  content: string
  hero_image_url?: string
  status: 'draft' | 'published'
  published_at?: string
  slug?: string
}

// 記事更新用の型定義
export interface UpdateArticleInput {
  title?: string
  content?: string
  hero_image_url?: string
  status?: 'draft' | 'published'
  published_at?: string
  slug?: string
}

// 全ての公開記事を取得
export async function getPublishedArticles() {
  const supabase = createClientSupabase()

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('公開記事の取得に失敗しました:', error)
    throw error
  }

  return data as Article[]
}

// 特定のユーザーの全ての記事を取得
export async function getUserArticles(userId: string) {
  const supabase = createClientSupabase()

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('author_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('ユーザーの記事取得に失敗しました:', error)
    throw error
  }

  return data as Article[]
}

// IDによる記事の取得
export async function getArticleById(id: string) {
  const supabase = createClientSupabase()

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('記事の取得に失敗しました:', error)
    throw error
  }

  return data as Article
}

// スラグによる記事の取得
export async function getArticleBySlug(slug: string) {
  const supabase = createClientSupabase()

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    console.error('記事の取得に失敗しました:', error)
    throw error
  }

  return data as Article
}

// 新しい記事の作成
export async function createArticle(authorId: string, articleData: CreateArticleInput) {
  const supabase = createClientSupabase()

  // 事前にUUIDを生成してslugを作成
  const { id, slug } = generateIdAndSlug();

  const { data, error } = await supabase
    .from('articles')
    .insert([
      {
        id, // 生成したUUIDを使用
        author_id: authorId,
        ...articleData,
        slug: articleData.slug || slug, // 明示的に指定されていればそれを使用、なければ生成したslugを使用
      },
    ])
    .select()

  if (error) {
    console.error('記事の作成に失敗しました:', error)
    throw error
  }

  return data?.[0] as Article
}

// 記事の更新
export async function updateArticle(id: string, articleData: UpdateArticleInput) {
  const supabase = createClientSupabase()

  // 更新データを準備
  const updateData = {
    ...articleData,
    updated_at: new Date().toISOString(),
  }

  // statusが'published'に変更されている場合、published_atがなければ設定
  if (articleData.status === 'published' && !articleData.published_at) {
    // 現在の記事データを取得して公開日時を確認
    const { data: currentArticle } = await supabase
      .from('articles')
      .select('published_at, status')
      .eq('id', id)
      .single()

    // 以前は非公開で、今回公開になる場合のみ公開日時を設定
    if (currentArticle && (currentArticle.status !== 'published' || !currentArticle.published_at)) {
      updateData.published_at = new Date().toISOString()
    }
  }

  const { data, error } = await supabase
    .from('articles')
    .update(updateData)
    .eq('id', id)
    .select()

  if (error) {
    console.error('記事の更新に失敗しました:', error)
    throw error
  }

  return data?.[0] as Article
}

// 記事の削除
export async function deleteArticle(id: string) {
  const supabase = createClientSupabase()

  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('記事の削除に失敗しました:', error)
    throw error
  }

  return true
}

// 記事の閲覧数をインクリメント
export async function incrementViewCount(id: string) {
  const supabase = createClientSupabase()

  const { data, error } = await supabase.rpc('increment_view_count', { article_id: id })

  if (error) {
    console.error('閲覧数の更新に失敗しました:', error)
    throw error
  }

  return data
}

// メディアアップロード関連の関数も実装予定 