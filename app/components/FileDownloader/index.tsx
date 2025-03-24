'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClientSupabase } from '@/lib/supabase-client';
import { ArrowDownTrayIcon as DownloadIcon } from '@heroicons/react/24/outline';
import { FileDownloaderProps, FileData, FolderNode } from './types';
import FolderStructure from './components/FolderStructure';
import { downloadSingleFile, downloadFolderAsZip } from './services/fileDownloadService';

/**
 * ファイルダウンローダーコンポーネント
 * 記事に関連するファイルをダウンロードするためのUIを提供する
 */
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

    // 第二階層までのフォルダを自動的に展開する
    useEffect(() => {
        if (files.length === 0 || loading) return;

        // 展開するフォルダのパスを収集
        const foldersToExpand: Record<string, boolean> = {};
        
        // パスごとに処理
        files.forEach(file => {
            const pathSegments = file.path ? file.path.split('/').filter(Boolean) : [];
            
            // 第一階層と第二階層のフォルダを展開
            let currentPath = '';
            
            // 最大2階層までを処理（パスセグメントの3番目まで）
            pathSegments.slice(0, 2).forEach(segment => {
                currentPath = currentPath ? `${currentPath}/${segment}` : segment;
                foldersToExpand[currentPath] = true;
            });
        });
        
        // 展開するフォルダを設定
        setExpandedFolders(foldersToExpand);
        console.log('自動的に展開するフォルダ:', Object.keys(foldersToExpand));
    }, [files, loading]);

    // フォルダ構造を構築
    const folderStructure = useMemo(() => {
        const rootFolder: FolderNode = {
            name: 'root',
            path: '',
            files: [],
            subfolders: {},
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
                
                // フォルダの階層レベルを計算（0=ルート、1=第一階層、2=第二階層）
                const level = index + 1;

                if (!currentFolder.subfolders[segment]) {
                    currentFolder.subfolders[segment] = {
                        name: segment,
                        path: `${currentPath}/`,
                        files: [],
                        subfolders: {},
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
    }, [files]);

    // フォルダの開閉状態を切り替え
    const toggleFolder = (path: string) => {
        setExpandedFolders(prev => ({
            ...prev,
            [path]: !prev[path]
        }));
    };

    // 単一ファイルをダウンロード処理
    const handleFileDownload = async (file: FileData) => {
        try {
            await downloadSingleFile(file, articleId);
        } catch (err) {
            console.error(`ファイル「${file.original_name}」のダウンロード中にエラー:`, err);
            setError(`「${file.original_name}」のダウンロード処理中にエラーが発生しました`);
        }
    };

    // フォルダをZIPとしてダウンロード処理
    const handleFolderDownload = async (folderPath: string) => {
        try {
            setDownloadingFolder(folderPath);
            setError(null);
            
            await downloadFolderAsZip(folderPath, files, articleId);
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
                                    onClick={() => handleFolderDownload('')}
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

                            <FolderStructure
                                folder={folderStructure}
                                expandedFolders={expandedFolders}
                                onToggleFolder={toggleFolder}
                                onDownloadFile={handleFileDownload}
                                onDownloadFolder={handleFolderDownload}
                                downloadingFolder={downloadingFolder}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
} 