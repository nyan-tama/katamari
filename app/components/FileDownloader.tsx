'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClientSupabase } from '@/lib/supabase-client';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
    FolderIcon,
    DocumentIcon,
    ArrowDownTrayIcon as DownloadIcon,
    ChevronRightIcon,
    ChevronDownIcon
} from '@heroicons/react/24/outline';

interface FileDownloaderProps {
    articleId: string;
}

interface FileData {
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

interface FolderNode {
    name: string;
    path: string;
    files: FileData[];
    subfolders: Record<string, FolderNode>;
    isExpanded?: boolean;
}

export default function FileDownloader({ articleId }: FileDownloaderProps) {
    const [files, setFiles] = useState<FileData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloadingFolder, setDownloadingFolder] = useState<string | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

    // ファイル情報を取得
    useEffect(() => {
        const fetchFileData = async () => {
            if (!articleId) return;
            setLoading(true);

            try {
                console.log(`記事ID: ${articleId} のファイルデータを取得中...`);

                const supabase = createClientSupabase();
                const { data, error } = await supabase
                    .from('download_files')
                    .select('*')
                    .eq('article_id', articleId);

                if (error) {
                    console.error('Supabaseエラー:', error);
                    throw error;
                }

                console.log(`取得したファイルデータ: ${data?.length || 0}件`, data);

                if (!data || data.length === 0) {
                    console.log('ファイルが見つかりませんでした');
                    setFiles([]);
                    setLoading(false);
                    return;
                }

                setFiles(data);
            } catch (err) {
                console.error('ファイルデータの取得中にエラーが発生しました:', err);
                setError('ファイル情報の読み込みに失敗しました');
            } finally {
                setLoading(false);
            }
        };

        fetchFileData();
    }, [articleId]);

    // フォルダ構造を構築
    const folderStructure = useMemo(() => {
        const rootFolder: FolderNode = {
            name: 'root',
            path: '',
            files: [],
            subfolders: {},
            isExpanded: true
        };

        // 最初にすべてのファイルをパスで整理
        files.forEach(file => {
            const pathSegments = file.path ? file.path.split('/').filter(Boolean) : []; // 空のセグメントを除去

            if (pathSegments.length === 0) {
                // ルートレベルのファイル（パスがない場合）
                rootFolder.files.push(file);
                return;
            }

            // サブフォルダ構造を構築
            let currentFolder = rootFolder;
            let currentPath = '';

            pathSegments.forEach((segment, index) => {
                currentPath = currentPath ? `${currentPath}/${segment}` : segment;

                if (!currentFolder.subfolders[segment]) {
                    currentFolder.subfolders[segment] = {
                        name: segment,
                        path: `${currentPath}/`,
                        files: [],
                        subfolders: {},
                        isExpanded: !!expandedFolders[currentPath]
                    };
                }

                currentFolder = currentFolder.subfolders[segment];

                // 最後のセグメントならこのフォルダにファイルを追加
                if (index === pathSegments.length - 1) {
                    currentFolder.files.push(file);
                }
            });
        });

        return rootFolder;
    }, [files, expandedFolders]);

    // フォルダの開閉状態を切り替え
    const toggleFolder = (path: string) => {
        setExpandedFolders(prev => ({
            ...prev,
            [path]: !prev[path]
        }));
    };

    // 安全なパスを生成する関数
    const createSafePath = (originalPath: string): string => {
        if (!originalPath) return '';

        // パスが既にエンコードされているか確認
        if (originalPath.includes('%')) {
            try {
                // 一度デコードしてみる
                const decoded = decodeURIComponent(originalPath);
                console.log('パスをデコードしました:', {
                    original: originalPath,
                    decoded
                });
                originalPath = decoded;
            } catch (err) {
                console.log('デコード失敗 - 元のパスを使用します:', originalPath);
            }
        }

        // より単純なエンコード方法を使用
        // パス部分とファイル名部分を分ける
        const lastSlashIndex = originalPath.lastIndexOf('/');
        if (lastSlashIndex === -1) {
            // スラッシュがない場合は単純にエンコード
            return encodeURIComponent(originalPath);
        }

        // パス部分とファイル名部分を別々に処理
        const pathPart = originalPath.substring(0, lastSlashIndex);
        const fileName = originalPath.substring(lastSlashIndex + 1);

        // パスの各セグメントを個別にエンコード
        const encodedPath = pathPart.split('/')
            .map(segment => encodeURIComponent(segment))
            .join('/');

        // ファイル名をエンコード
        const encodedFileName = encodeURIComponent(fileName);

        // 結合
        const result = `${encodedPath}/${encodedFileName}`;

        console.log('パスのエンコード処理:', {
            originalPath,
            result
        });

        return result;
    };

    // 単一ファイルをダウンロード
    const downloadFile = async (file: FileData) => {
        try {
            console.log(`ファイル「${file.original_name}」のダウンロード開始:`, {
                storagePath: file.storage_path,
                bucket: file.storage_bucket
            });

            const supabase = createClientSupabase();

            // 安全なパスを生成
            const encodedPath = createSafePath(file.storage_path);

            console.log('ダウンロードパス:', {
                original: file.storage_path,
                encoded: encodedPath
            });

            // 代替パスを試す準備（日本語パスが問題の場合）
            let alternativePath = '';
            if (file.storage_path && file.storage_path.includes('/')) {
                const pathParts = file.storage_path.split('/');
                const fileName = pathParts.pop() || '';

                // より安全な代替パスの生成方法
                if (fileName) {
                    // アーティクルIDと最後のファイル名のみを使用する単純な代替パス
                    alternativePath = `${articleId}/${encodeURIComponent(fileName)}`;

                    console.log('生成した単純な代替パス:', {
                        originalPath: file.storage_path,
                        alternativePath
                    });
                }
            }

            try {
                // 通常のパスで試みる
                const { data, error } = await supabase.storage
                    .from(file.storage_bucket)
                    .download(encodedPath);

                if (error) {
                    console.error('通常パスでのダウンロードエラー:', error);

                    // 代替パスがあれば試す
                    if (alternativePath) {
                        console.log('代替パスでダウンロード試行:', alternativePath);
                        const { data: altData, error: altError } = await supabase.storage
                            .from(file.storage_bucket)
                            .download(alternativePath);

                        if (altError) {
                            console.error('代替パスでもダウンロードエラー:', altError);
                            throw new Error(`${file.original_name}のダウンロードに失敗しました`);
                        }

                        if (!altData) {
                            throw new Error(`${file.original_name}のダウンロードに失敗しました: データが取得できません`);
                        }

                        // 代替パスでダウンロード成功
                        console.log(`代替パスでファイル「${file.original_name}」のダウンロード成功`);

                        // Blobとしてダウンロード
                        const blob = altData;
                        const url = URL.createObjectURL(blob);

                        // ダウンロードリンクを作成
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = file.original_name;
                        document.body.appendChild(a);
                        a.click();

                        // クリーンアップ
                        URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                        return;
                    }

                    throw error;
                }

                if (!data) {
                    throw new Error(`${file.original_name}のダウンロードに失敗しました: データが取得できません`);
                }

                // Blobとしてダウンロード
                const blob = data;
                const url = URL.createObjectURL(blob);

                // ダウンロードリンクを作成
                const a = document.createElement('a');
                a.href = url;
                a.download = file.original_name;
                document.body.appendChild(a);
                a.click();

                // クリーンアップ
                URL.revokeObjectURL(url);
                document.body.removeChild(a);

                console.log(`ファイル「${file.original_name}」のダウンロード完了`);
            } catch (downloadErr) {
                console.error('ダウンロード処理エラー:', downloadErr);
                throw downloadErr;
            }
        } catch (err) {
            console.error(`ファイル「${file.original_name}」のダウンロード中にエラー:`, err);
            setError(`「${file.original_name}」のダウンロード処理中にエラーが発生しました`);
        }
    };

    // フォルダをZIPとしてダウンロード
    const downloadFolder = async (folderPath: string) => {
        try {
            setDownloadingFolder(folderPath);
            setError(null);

            console.log(`フォルダ「${folderPath}」のZIPダウンロード開始`);

            // フォルダ内のすべてのファイルを収集
            const folderFiles = files.filter(file =>
                !file.path ? folderPath === '' : (file.path === folderPath || file.path.startsWith(folderPath))
            );

            if (folderFiles.length === 0) {
                setError('フォルダ内にダウンロード可能なファイルがありません');
                setDownloadingFolder(null);
                return;
            }

            console.log(`ダウンロード対象ファイル: ${folderFiles.length}件`,
                folderFiles.map(f => ({ name: f.original_name, path: f.path })));

            const zip = new JSZip();
            const supabase = createClientSupabase();

            // 各ファイルをダウンロードしてZIPに追加
            for (const file of folderFiles) {
                try {
                    console.log(`ZIPに追加: ${file.path}${file.original_name}`);

                    // 安全なパスを生成
                    const encodedPath = createSafePath(file.storage_path);

                    // 代替パスを生成（日本語パスが問題の場合）
                    let alternativePath = '';
                    if (file.storage_path && file.storage_path.includes('/')) {
                        const pathParts = file.storage_path.split('/');
                        const fileName = pathParts.pop() || '';

                        // より安全な代替パスの生成方法
                        if (fileName) {
                            // アーティクルIDと最後のファイル名のみを使用する単純な代替パス
                            alternativePath = `${articleId}/${encodeURIComponent(fileName)}`;

                            console.log('生成した単純な代替パス:', {
                                originalPath: file.storage_path,
                                alternativePath
                            });
                        }
                    }

                    let fileData = null;

                    // 通常のパスでダウンロード試行
                    const { data, error } = await supabase.storage
                        .from(file.storage_bucket)
                        .download(encodedPath);

                    if (error) {
                        console.error(`ファイル「${file.original_name}」の取得エラー:`, error);

                        // 代替パスがあれば試す
                        if (alternativePath) {
                            console.log('代替パスでダウンロード試行:', alternativePath);
                            const { data: altData, error: altError } = await supabase.storage
                                .from(file.storage_bucket)
                                .download(alternativePath);

                            if (altError) {
                                console.error('代替パスでもダウンロードエラー:', altError);
                                continue; // このファイルはスキップ
                            }

                            if (!altData) {
                                console.error(`ファイル「${file.original_name}」のダウンロードにデータがありません`);
                                continue; // このファイルはスキップ
                            }

                            fileData = altData;
                        } else {
                            continue; // このファイルはスキップ
                        }
                    } else {
                        fileData = data;
                    }

                    if (!fileData) {
                        continue; // データがない場合はスキップ
                    }

                    // ファイルをZIPに追加（元のパス構造を維持）
                    // フォルダ内の相対パスを計算 (ルートフォルダの場合は考慮)
                    let relativePath = '';
                    if (file.path) {
                        relativePath = folderPath === ''
                            ? `${file.path}${file.original_name}`
                            : `${file.path.substring(folderPath.length)}${file.original_name}`;
                    } else {
                        relativePath = file.original_name;
                    }

                    // 先頭の / を削除（ZIPでの相対パス用）
                    if (relativePath.startsWith('/')) {
                        relativePath = relativePath.substring(1);
                    }

                    zip.file(relativePath, await fileData.arrayBuffer());
                    console.log(`ファイル「${relativePath}」をZIPに追加しました`);
                } catch (fileErr) {
                    console.error(`ファイル「${file.original_name}」の処理中にエラー:`, fileErr);
                    // エラーがあっても続行
                }
            }

            // ZIPファイルを生成してダウンロード
            const content = await zip.generateAsync({ type: 'blob' });
            const folderName = folderPath.split('/').filter(Boolean).pop() || articleId;

            // UUIDからフォルダ名を生成（アップロード時と同じ形式）
            const uuidParts = articleId.split('-');
            let zipFileName = folderName;
            if (uuidParts.length >= 2) {
                // 1つ目のパート（8桁）と2つ目のパート（最初の4桁）を使用
                const firstPart = uuidParts[0];           // 例: 39dab4d8
                const secondPart = uuidParts[1].substring(0, 4); // 例: f600 (f600から4文字)
                zipFileName = `3D-PRINTER-DOWNLOAD-DATA-${firstPart}-${secondPart}`;
                // フォルダ名も追加
                if (folderName !== articleId) {
                    zipFileName += `_${folderName}`;
                }
            }

            saveAs(content, `${zipFileName}.zip`);

            console.log(`フォルダ「${folderPath}」のZIPダウンロード完了: ${zipFileName}.zip`);
        } catch (err) {
            console.error(`フォルダのZIP作成中にエラー:`, err);
            setError('ZIPファイルの作成中にエラーが発生しました');
        } finally {
            setDownloadingFolder(null);
        }
    };

    // ファイルがない場合のメッセージ
    if (!loading && files.length === 0) {
        return (
            <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-2">ダウンロードファイル</h2>
                <p className="text-gray-600">この記事にはダウンロードファイルがありません</p>
            </div>
        );
    }

    // フォルダコンポーネントを再帰的にレンダリング
    const RenderFolder = ({ folder, path = '' }: { folder: FolderNode, path: string }) => {
        const isExpanded = folder.isExpanded || !!expandedFolders[path];
        const hasFiles = folder.files.length > 0;
        const hasSubfolders = Object.keys(folder.subfolders).length > 0;

        if (folder.name === 'root') {
            // ルートフォルダは特別扱い
            return (
                <div>
                    {/* ルートレベルのファイル */}
                    {hasFiles && (
                        <ul className="divide-y border-t border-b">
                            {folder.files.map(file => (
                                <FileItem key={file.id} file={file} />
                            ))}
                        </ul>
                    )}

                    {/* サブフォルダー */}
                    {Object.values(folder.subfolders).map(subfolder => (
                        <RenderFolder
                            key={subfolder.path}
                            folder={subfolder}
                            path={subfolder.path}
                        />
                    ))}
                </div>
            );
        }

        return (
            <div className="mb-4">
                <div
                    className="flex items-center py-2 px-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleFolder(path)}
                >
                    {isExpanded ? (
                        <ChevronDownIcon className="h-4 w-4 mr-1 text-gray-500" />
                    ) : (
                        <ChevronRightIcon className="h-4 w-4 mr-1 text-gray-500" />
                    )}
                    <FolderIcon className="h-5 w-5 mr-2 text-yellow-500" />
                    <span className="font-medium">{folder.name}</span>
                    <span className="ml-2 text-sm text-gray-500">
                        ({folder.files.length}ファイル
                        {hasSubfolders && `, ${Object.keys(folder.subfolders).length}フォルダ`})
                    </span>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            downloadFolder(folder.path);
                        }}
                        disabled={!!downloadingFolder}
                        className="ml-auto text-blue-600 hover:text-blue-800 px-3 py-1 text-sm rounded hover:bg-blue-50"
                    >
                        {downloadingFolder === folder.path ? '処理中...' : 'ZIP でダウンロード'}
                    </button>
                </div>

                {isExpanded && (
                    <div className="pl-6 border-l ml-4 mt-2">
                        {/* サブフォルダのファイル */}
                        {hasFiles && (
                            <ul className="divide-y border-t border-b mb-4">
                                {folder.files.map(file => (
                                    <FileItem key={file.id} file={file} />
                                ))}
                            </ul>
                        )}

                        {/* 更に深いサブフォルダー */}
                        {Object.values(folder.subfolders).map(subfolder => (
                            <RenderFolder
                                key={subfolder.path}
                                folder={subfolder}
                                path={subfolder.path}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // ファイル項目コンポーネント
    const FileItem = ({ file }: { file: FileData }) => {
        return (
            <li className="flex items-center py-2 px-3 hover:bg-gray-50">
                <DocumentIcon className="h-5 w-5 mr-2 text-gray-400" />
                <span className="truncate flex-grow">{file.original_name}</span>
                <span className="text-sm text-gray-500 mx-2">
                    {formatFileSize(file.file_size)}
                </span>
                <button
                    onClick={() => downloadFile(file)}
                    className="text-blue-600 hover:text-blue-800 px-3 py-1 text-sm rounded hover:bg-blue-50"
                >
                    <DownloadIcon className="h-4 w-4" />
                </button>
            </li>
        );
    };

    // ファイルサイズのフォーマット
    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">ダウンロードファイル</h2>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="py-4 text-center text-gray-500">
                    <svg className="animate-spin h-5 w-5 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    ファイル情報を読み込み中...
                </div>
            ) : (
                <>
                    {files.length > 0 && (
                        <div>
                            <div className="mb-4 flex justify-end">
                                <button
                                    onClick={() => downloadFolder('')}
                                    disabled={!!downloadingFolder}
                                    className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md flex items-center gap-2 disabled:opacity-50"
                                >
                                    {downloadingFolder === '' ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            処理中...
                                        </>
                                    ) : (
                                        <>
                                            <DownloadIcon className="h-5 w-5" />
                                            すべてダウンロード (ZIP)
                                        </>
                                    )}
                                </button>
                            </div>

                            <RenderFolder folder={folderStructure} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
} 