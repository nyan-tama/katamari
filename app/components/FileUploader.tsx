'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { createClientSupabase } from '@/lib/supabase-client';

interface FileUploaderProps {
    articleId: string;
    onFilesUploaded: (files: any[]) => void;
}

export default function FileUploader({ articleId, onFilesUploaded }: FileUploaderProps) {
    const [files, setFiles] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        // 既存のファイルと合わせる
        setFiles(prev => [...prev, ...acceptedFiles.map(file =>
            Object.assign(file, { preview: URL.createObjectURL(file) })
        )]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/octet-stream': ['.stl'],
            'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
            'application/zip': ['.zip'],
            'text/plain': ['.txt'],
            'application/pdf': ['.pdf'],
        },
        maxSize: 50 * 1024 * 1024, // 50MB
    });

    const uploadFiles = async () => {
        if (files.length === 0) return;

        setUploading(true);
        setError(null);

        try {
            const supabase = createClientSupabase();
            const uploadedFiles = [];

            for (const file of files) {
                // ファイルパスの構築
                const filePath = `${articleId}/${file.name}`;

                // Supabaseストレージにアップロード
                const { data, error } = await supabase.storage
                    .from('downloads')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (error) throw error;

                // download_filesテーブルにメタデータを保存
                const { data: fileData, error: fileError } = await supabase
                    .from('download_files')
                    .insert({
                        article_id: articleId,
                        file_name: file.name,
                        file_path: filePath,
                        file_size: file.size,
                        mime_type: file.type
                    })
                    .select()
                    .single();

                if (fileError) throw fileError;

                uploadedFiles.push(fileData);
            }

            // 親コンポーネントに通知
            onFilesUploaded(uploadedFiles);

            // 成功したらファイルリストをクリア
            setFiles([]);

        } catch (err: any) {
            console.error('ファイルアップロードエラー:', err);
            setError(err.message || 'ファイルのアップロードに失敗しました');
        } finally {
            setUploading(false);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-4">
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
            >
                <input {...getInputProps()} />
                {isDragActive ? (
                    <p className="text-blue-500">ファイルをドロップしてください...</p>
                ) : (
                    <div>
                        <p>ファイルをドラッグ＆ドロップするか、クリックして選択してください</p>
                        <p className="text-sm text-gray-500 mt-1">最大サイズ: 50MB、STL/PNG/JPG/PDF/TXTなど</p>
                    </div>
                )}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {files.length > 0 && (
                <div className="space-y-2">
                    <h3 className="font-medium">アップロード待ちファイル ({files.length})</h3>
                    <ul className="border rounded divide-y">
                        {files.map((file, index) => (
                            <li key={index} className="flex items-center justify-between p-3">
                                <div className="flex items-center">
                                    <span className="truncate max-w-xs">{file.name}</span>
                                    <span className="text-xs text-gray-500 ml-2">
                                        ({(file.size / 1024).toFixed(1)} KB)
                                    </span>
                                </div>
                                <button
                                    onClick={() => removeFile(index)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    削除
                                </button>
                            </li>
                        ))}
                    </ul>

                    <button
                        onClick={uploadFiles}
                        disabled={uploading}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                        {uploading ? 'アップロード中...' : 'ファイルをアップロード'}
                    </button>
                </div>
            )}
        </div>
    );
} 