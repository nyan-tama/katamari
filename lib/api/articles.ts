import { createClient } from '@supabase/supabase-js'
import { createClientSupabase } from '@/lib/supabase-client'

// 記事の型定義
export interface Article {
  id: string
  author_id: string
  title: string
  content: string
  hero_image?: string
  status: 'draft' | 'published'
  view_count: number
  download_count: number
  created_at: string
  updated_at: string
}

// 記事作成用の型定義
export interface CreateArticleInput {
  title: string
  content: string
  hero_image?: string
  status: 'draft' | 'published'
}

// 記事更新用の型定義
export interface UpdateArticleInput {
  title?: string
  content?: string
  hero_image?: string
  status?: 'draft' | 'published'
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

// 新しい記事の作成
export async function createArticle(authorId: string, articleData: CreateArticleInput) {
  const supabase = createClientSupabase()
  
  const { data, error } = await supabase
    .from('articles')
    .insert([
      {
        author_id: authorId,
        ...articleData,
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
  
  const { data, error } = await supabase
    .from('articles')
    .update({
      ...articleData,
      updated_at: new Date().toISOString(),
    })
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