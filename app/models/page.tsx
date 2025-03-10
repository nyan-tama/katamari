import { redirect } from 'next/navigation';

export default function ModelsPage() {
  // 記事一覧ページにリダイレクト
  redirect('/articles');
} 