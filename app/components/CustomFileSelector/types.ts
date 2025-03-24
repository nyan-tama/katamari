/**
 * CustomFileSelectorコンポーネントの型定義
 */

export interface CustomFileSelectorProps {
    onFilesSelected: (files: File[]) => void;
    onFilesDeleted?: (fileIds: string[]) => void;
    initialFiles?: {
        id: string;
        original_name: string;
        file_size: number;
        file_type: string;
        storage_path: string;
        path: string;
    }[];
}

// ファイル拡張インターフェース（パス情報を追加）
export interface ExtendedFile {
    // 元のFileオブジェクトへの参照
    originalFile: File;
    // 追加のパス情報
    relativePath: string;
    // プレビュー用URL
    preview?: string;
    // FileオブジェクトからForwardするプロパティ
    name: string;
    size: number;
    type: string;
    // 既存ファイル情報（編集時に使用）
    id?: string;
    storagePath?: string;
    isExisting?: boolean;
}

// フォルダ構造のインターフェース
export interface FolderNode {
    name: string;
    path: string;
    files: ExtendedFile[];
    subfolders: Record<string, FolderNode>;
}

export interface FileValidationResult {
    valid: boolean;
    reason?: string;
}

export type ValidationErrorType = 'error' | 'warning'; 