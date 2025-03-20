'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface CustomFileSelectorProps {
    onFilesSelected: (files: File[]) => void;
}

export default function CustomFileSelector({ onFilesSelected }: CustomFileSelectorProps) {
    const [files, setFiles] = useState<File[]>([]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        // 新しいファイルを既存のファイルと結合
        const newFiles = [...files, ...acceptedFiles];
        setFiles(newFiles);
        onFilesSelected(newFiles); // 親コンポーネントに通知
    }, [files, onFilesSelected]);

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

    const removeFile = (index: number) => {
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);
        onFilesSelected(newFiles); // 親コンポーネントに通知
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

            {files.length > 0 && (
                <div className="space-y-2">
                    <h3 className="font-medium">選択済みファイル ({files.length})</h3>
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
                                    type="button"
                                    className="text-red-500 hover:text-red-700"
                                >
                                    削除
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
} 