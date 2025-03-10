import { redirect } from 'next/navigation';

export default function ModelDetailPage({ params }: { params: { id: string } }) {
  // 記事詳細ページにリダイレクト
  // 注意: ここでは同じIDを使用していますが、実際のシステムでは
  // IDの対応関係が異なる可能性があります
  redirect('/articles');
}