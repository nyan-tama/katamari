/**
 * FileUploaderコンポーネントの型定義
 */

export interface FileUploaderProps {
    articleId: string;
    onFilesUploaded: (files: UploadedFileData[]) => void;
}

export interface UploadedFileData {
    id: string;
    article_id: string;
    original_name: string;
    path: string;
    storage_path: string;
    file_size: number;
    file_type: string;
    mime_type?: string;
    storage_bucket: string;
    created_at?: string;
}

export interface FileValidationResult {
    valid: boolean;
    reason?: string;
}

export type ErrorType = 'error' | 'warning';

export interface UploadResult {
    success: boolean;
    files: UploadedFileData[];
    error?: string;
} 