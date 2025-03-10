import { redirect } from 'next/navigation';

export default function ModelEditPage({ params }: { params: { id: string } }) {
  // 記事一覧ページにリダイレクト
  // 理想的には対応する記事編集ページへリダイレクトするべきですが、
  // 記事とモデルのIDに対応関係がないためトップレベルの記事ページへリダイレクト
  redirect('/articles');
} 