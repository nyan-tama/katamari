/**
 * FileDownloader関連の型定義
 */

export interface FileDownloaderProps {
    articleId: string;
}

export interface FileData {
    id: string;
    article_id: string;
    original_name: string;
    storage_path: string;
    path: string;
    file_size: number;
    file_type: string;
    storage_bucket: string;
    created_at: string;
    mime_type?: string | null;
}

export interface FolderNode {
    name: string;
    path: string;
    files: FileData[];
    subfolders: Record<string, FolderNode>;
} 