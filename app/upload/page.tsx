import { redirect } from 'next/navigation';

export default function UploadPage() {
    // 記事作成ページへリダイレクト
    redirect('/articles/new');
}