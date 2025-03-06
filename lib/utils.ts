// 絶対URLを生成するヘルパー関数
export function getAbsoluteUrl(path: string): string {
    return `${process.env.NEXT_PUBLIC_SITE_URL}${path}`
}

// 使用例：ソーシャルシェアリンクの生成
export function getShareUrl(modelId: string): string {
    return getAbsoluteUrl(`/models/${modelId}`)
} 