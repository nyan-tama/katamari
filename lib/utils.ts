// 絶対URLを生成するヘルパー関数
export function getAbsoluteUrl(path: string): string {
    return `${process.env.NEXT_PUBLIC_SITE_URL}${path}`
}

// 使用例：ソーシャルシェアリンクの生成
export function getShareUrl(articleId: string): string {
    return getAbsoluteUrl(`/articles/${articleId}`)
} 