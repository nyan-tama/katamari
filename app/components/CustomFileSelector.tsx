'use client';

import { useCallback, useState, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    FolderIcon,
    DocumentIcon,
    ChevronRightIcon,
    ChevronDownIcon
} from '@heroicons/react/24/outline';

interface CustomFileSelectorProps {
    onFilesSelected: (files: File[]) => void;
}

// ファイル拡張インターフェース（パス情報を追加）
interface ExtendedFile {
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
}

// フォルダ構造のインターフェース
interface FolderNode {
    name: string;
    path: string;
    files: ExtendedFile[];
    subfolders: Record<string, FolderNode>;
}

export default function CustomFileSelector({ onFilesSelected }: CustomFileSelectorProps) {
    const [files, setFiles] = useState<ExtendedFile[]>([]);
    const [uploadMode, setUploadMode] = useState<'files' | 'folder'>('files');
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const [validationError, setValidationError] = useState<string | null>(null);
    const [validationErrorType, setValidationErrorType] = useState<'error' | 'warning'>('error');

    // ファイル名バリデーション関数
    const validateFileName = (fileName: string): { valid: boolean; reason?: string } => {
        // 禁止文字のチェック
        const forbiddenChars = ['/', '\\', ':', '*', '?', '"', "'", '<', '>', '|', ';'];
        const hasForbiddenChar = forbiddenChars.some(char => fileName.includes(char));
        if (hasForbiddenChar) {
            return {
                valid: false,
                reason: `ファイル名に次の文字を含めることはできません: ${forbiddenChars.join(' ')}`
            };
        }

        // Windows予約語のチェック（ベース名のみ）
        const fileNameBase = fileName.split('.')[0].toUpperCase();
        const windowsReserved = ['CON', 'PRN', 'AUX', 'NUL',
            'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
        const isWindowsReserved = windowsReserved.includes(fileNameBase);
        if (isWindowsReserved) {
            return {
                valid: false,
                reason: `"${fileNameBase}" はWindowsの予約語で使用できません`
            };
        }

        // システム関連ファイルチェック
        const systemFiles = ['.gitignore', 'HEAD', '.env', '.ds_store', '.DS_Store', 'Thumbs.db', 'COMMIT_EDITMSG'];
        const isSystemFile = systemFiles.some(name => fileName.toLowerCase().trim() === name.toLowerCase());
        if (isSystemFile) {
            return {
                valid: false,
                reason: `"${fileName}" はシステム関連ファイルのため使用できません`
            };
        }

        // 機密情報ファイルのパターンチェック
        const sensitivePatterns = /^\.env(\.|$)|secrets\./i;
        const isSensitiveFile = sensitivePatterns.test(fileName);
        if (isSensitiveFile) {
            return {
                valid: false,
                reason: `"${fileName}" は機密情報を含む可能性があるため使用できません`
            };
        }

        // 長さのチェック
        const isTooLong = fileName.length > 250;
        if (isTooLong) {
            return {
                valid: false,
                reason: 'ファイル名が長すぎます（250文字以下にしてください）'
            };
        }

        // 先頭や末尾のスペース/ドットチェック
        const hasLeadingOrTrailingSpace = fileName.startsWith(' ') || fileName.endsWith(' ');
        if (hasLeadingOrTrailingSpace) {
            return {
                valid: false,
                reason: 'ファイル名の先頭または末尾にスペースを含めることはできません'
            };
        }

        // 拡張子の偽装チェック（例：.jpg.exeのような形式）
        const suspiciousExtensions = /\.(jpg|png|gif|jpeg|pdf|doc|docx)\.(exe|bat|sh|cmd|vbs|js)$/i;
        const hasSuspiciousExtension = suspiciousExtensions.test(fileName);
        if (hasSuspiciousExtension) {
            return {
                valid: false,
                reason: '不審な拡張子の組み合わせです。セキュリティ上の理由でアップロードできません'
            };
        }

        return { valid: true };
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        // システムフォルダとシステムファイルのチェック
        const systemFolders = ['.git', 'node_modules', '.svn', '.hg', '.vscode'];
        const systemFiles = ['.gitignore', 'HEAD', '.env', '.ds_store', '.DS_Store', 'Thumbs.db', 'COMMIT_EDITMSG'];

        const systemFolderFiles: File[] = [];
        let detectedSystemFolder = '';
        let detectedSystemFiles: string[] = [];
        let hasLongPathWarning = false;
        const MAX_PATH_LENGTH = 250; // データベースのパスカラムの最大長を想定

        // システムファイルチェック用のログ
        console.log('ドロップされたファイル一覧:');
        acceptedFiles.forEach(file => {
            console.log(`- ${file.name} (${file.size} bytes)`);

            // パスの長さをチェック
            // @ts-expect-error: webkitRelativePathはstandard DOMプロパティではない
            const relativePath = file.webkitRelativePath || '';
            if (relativePath && relativePath.length > MAX_PATH_LENGTH) {
                console.log(`長すぎるパスを検出: ${relativePath.substring(0, 50)}... (${relativePath.length}文字)`);
                hasLongPathWarning = true;
            }
        });

        // 問題のないファイルをフィルタリング
        const filteredFiles = acceptedFiles.filter(file => {
            // ファイル名だけでシステムファイルをチェック
            const fileName = file.name.toLowerCase().trim();

            // システムファイルチェック
            for (const sysFile of systemFiles) {
                if (fileName === sysFile.toLowerCase()) {
                    console.log(`システムファイル検出: ${file.name} (一致: ${sysFile})`);
                    detectedSystemFiles.push(file.name);
                    return false; // システムファイルはフィルタリング
                }
            }

            // @ts-expect-error: webkitRelativePathはstandard DOMプロパティではない
            const relativePath = file.webkitRelativePath || '';
            if (relativePath && relativePath.includes('/')) {
                console.log(`パスチェック: ${relativePath}`);
                const pathParts = relativePath.split('/');
                // フォルダパスの各部分をチェック
                for (const part of pathParts) {
                    const partLower = part.toLowerCase().trim();
                    if (systemFolders.includes(partLower)) {
                        if (!detectedSystemFolder) {
                            detectedSystemFolder = part;
                        }
                        systemFolderFiles.push(file);
                        return false;
                    }
                    // パス内の.DS_Storeファイルもチェック
                    for (const sysFile of systemFiles) {
                        if (partLower === sysFile.toLowerCase()) {
                            console.log(`パス内のシステムファイル検出: ${part} in ${relativePath}`);
                            detectedSystemFiles.push(part);
                            return false;
                        }
                    }
                }
            }

            // ファイル名のバリデーション
            const validation = validateFileName(file.name);
            return validation.valid;
        });

        // エラーメッセージの設定
        if (detectedSystemFolder && systemFolderFiles.length > 0) {
            // システムフォルダが検出された場合
            setValidationError(`"${detectedSystemFolder}" を含むパスのファイル(${systemFolderFiles.length}件)はシステム関連フォルダのためアップロードできませんので除外しました`);
            setValidationErrorType('warning'); // 警告タイプに変更
        } else if (detectedSystemFiles.length > 0) {
            // システムファイルが検出された場合
            setValidationError(`システムファイル "${detectedSystemFiles.join('", "')}" が検出されたため除外しました`);
            setValidationErrorType('warning'); // 警告タイプ
        } else if (hasLongPathWarning) {
            // 長すぎるパスがある場合
            setValidationError(`フォルダの階層が深すぎるファイルが検出されました。パスが${MAX_PATH_LENGTH}文字を超えるとアップロードできません。より浅い階層のフォルダ構造を使用してください。`);
            setValidationErrorType('warning');
        } else {
            setValidationError(null);
        }

        // 拡張ファイルオブジェクトを作成
        const extendedFiles = filteredFiles.map(file => {
            // @ts-expect-error: webkitRelativePathはstandard DOMプロパティではない
            const relativePath = file.webkitRelativePath || '';

            return {
                originalFile: file,
                relativePath,
                name: file.name,
                size: file.size,
                type: file.type,
                // 画像ファイルの場合はプレビュー用URLを生成
                preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
            };
        });

        // ドロップ処理の結果をログ出力
        console.log('処理結果:', {
            元のファイル数: acceptedFiles.length,
            フィルター後のファイル数: filteredFiles.length,
            システムファイル: detectedSystemFiles,
            システムフォルダ: detectedSystemFolder
        });

        // 状態を更新
        setFiles(extendedFiles);
        onFilesSelected(filteredFiles);
    }, [onFilesSelected]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        // accept制限を削除し、あらゆるファイルタイプを許可
        maxSize: 50 * 1024 * 1024, // 50MB
    });

    // フォルダ選択処理
    const handleFolderSelect = (evt: React.ChangeEvent<HTMLInputElement>) => {
        if (!evt.target.files || evt.target.files.length === 0) return;

        // システムフォルダとシステムファイルのチェック
        const systemFolders = ['.git', 'node_modules', '.svn', '.hg', '.vscode'];
        const systemFiles = ['.gitignore', 'HEAD', '.env', '.ds_store', '.DS_Store', 'Thumbs.db', 'COMMIT_EDITMSG'];

        const systemFolderFiles: File[] = [];
        let detectedSystemFolder = '';
        let detectedSystemFiles: string[] = [];
        let hasLongPathWarning = false;
        const MAX_PATH_LENGTH = 250; // データベースのパスカラムの最大長を想定
        const files = Array.from(evt.target.files);

        // システムファイルチェック用のログ
        console.log('フォルダ選択されたファイル一覧:');
        files.forEach(file => {
            console.log(`- ${file.name} (${file.size} bytes)`);

            // パスの長さをチェック
            // @ts-expect-error: webkitRelativePathはstandard DOMプロパティではない
            const relativePath = file.webkitRelativePath || '';
            if (relativePath && relativePath.length > MAX_PATH_LENGTH) {
                console.log(`長すぎるパスを検出: ${relativePath.substring(0, 50)}... (${relativePath.length}文字)`);
                hasLongPathWarning = true;
            }
        });

        // 問題のないファイルをフィルタリング
        const filteredFiles = files.filter(file => {
            // ファイル名だけでシステムファイルをチェック
            const fileName = file.name.toLowerCase().trim();

            // システムファイルチェック
            for (const sysFile of systemFiles) {
                if (fileName === sysFile.toLowerCase()) {
                    console.log(`システムファイル検出: ${file.name} (一致: ${sysFile})`);
                    detectedSystemFiles.push(file.name);
                    return false; // システムファイルはフィルタリング
                }
            }

            // @ts-expect-error: webkitRelativePathはstandard DOMプロパティではない
            const relativePath = file.webkitRelativePath || '';
            if (relativePath) {
                console.log(`フォルダパスチェック: ${relativePath}`);
                const pathParts = relativePath.split('/');
                // フォルダパスの各部分をチェック
                for (const part of pathParts) {
                    const partLower = part.toLowerCase().trim();
                    if (systemFolders.includes(partLower)) {
                        if (!detectedSystemFolder) {
                            detectedSystemFolder = part;
                        }
                        systemFolderFiles.push(file);
                        return false;
                    }
                    // パス内の.DS_Storeファイルもチェック
                    for (const sysFile of systemFiles) {
                        if (partLower === sysFile.toLowerCase()) {
                            console.log(`パス内のシステムファイル検出: ${part} in ${relativePath}`);
                            detectedSystemFiles.push(part);
                            return false;
                        }
                    }
                }
            }

            // ファイル名のバリデーション
            const validation = validateFileName(file.name);
            return validation.valid;
        });

        // エラーメッセージの設定
        if (detectedSystemFolder && systemFolderFiles.length > 0) {
            // システムフォルダが検出された場合
            setValidationError(`"${detectedSystemFolder}" を含むパスのファイル(${systemFolderFiles.length}件)はシステム関連フォルダのためアップロードできませんので除外しました`);
            setValidationErrorType('warning'); // 警告タイプに変更
        } else if (detectedSystemFiles.length > 0) {
            // システムファイルが検出された場合
            setValidationError(`システムファイル "${detectedSystemFiles.join('", "')}" が検出されたため除外しました`);
            setValidationErrorType('warning'); // 警告タイプ
        } else if (hasLongPathWarning) {
            // 長すぎるパスがある場合
            setValidationError(`フォルダの階層が深すぎるファイルが検出されました。パスが${MAX_PATH_LENGTH}文字を超えるとアップロードできません。より浅い階層のフォルダ構造を使用してください。`);
            setValidationErrorType('warning');
        } else {
            setValidationError(null);
        }

        // 拡張ファイルオブジェクトを作成
        const extendedFiles = filteredFiles.map(file => {
            // @ts-expect-error: webkitRelativePathはstandard DOMプロパティではない
            const relativePath = file.webkitRelativePath || '';

            return {
                originalFile: file,
                relativePath,
                name: file.name,
                size: file.size,
                type: file.type,
                // 画像ファイルの場合はプレビュー用URLを生成
                preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
            };
        });

        // フォルダ選択処理の結果をログ出力
        console.log('フォルダ処理結果:', {
            元のファイル数: files.length,
            フィルター後のファイル数: filteredFiles.length,
            システムファイル: detectedSystemFiles,
            システムフォルダ: detectedSystemFolder
        });

        // 状態を更新
        setFiles(extendedFiles);
        onFilesSelected(filteredFiles);
    };

    // フォルダ構造を構築
    const folderStructure = useMemo(() => {
        const rootFolder: FolderNode = {
            name: 'root',
            path: '',
            files: [],
            subfolders: {}
        };

        // ファイルを階層構造に整理
        files.forEach(file => {
            const relativePath = file.relativePath || file.name;

            if (!relativePath.includes('/')) {
                // ルートレベルのファイル
                rootFolder.files.push(file);
                return;
            }

            // フォルダ内のファイル
            const pathParts = relativePath.split('/');
            const fileName = pathParts.pop() || '';

            // サブフォルダ構造を構築
            let currentFolder = rootFolder;
            let currentPath = '';

            pathParts.forEach((part) => {
                currentPath = currentPath ? `${currentPath}/${part}` : part;

                if (!currentFolder.subfolders[part]) {
                    currentFolder.subfolders[part] = {
                        name: part,
                        path: currentPath,
                        files: [],
                        subfolders: {}
                    };
                }

                currentFolder = currentFolder.subfolders[part];
            });

            // ファイルをフォルダに追加
            currentFolder.files.push(file);
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

    // ファイルサイズのフォーマット
    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // フォルダコンポーネントを再帰的にレンダリング
    const RenderFolder = ({ folder, path = '' }: { folder: FolderNode, path: string }) => {
        const isExpanded = path === '' || expandedFolders[path];
        const hasFiles = folder.files.length > 0;
        const hasSubfolders = Object.keys(folder.subfolders).length > 0;

        if (folder.name === 'root') {
            // ルートフォルダは特別扱い
            return (
                <div>
                    {/* ルートレベルのファイル */}
                    {hasFiles && (
                        <ul className="divide-y border-t border-b mb-4">
                            {folder.files.map((file, index) => (
                                <FileItem key={`root-${index}`} file={file} />
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
                </div>

                {isExpanded && (
                    <div className="pl-6 border-l ml-4 mt-2">
                        {/* サブフォルダのファイル */}
                        {hasFiles && (
                            <ul className="divide-y border-t border-b mb-4">
                                {folder.files.map((file, index) => (
                                    <FileItem key={`${path}-${index}`} file={file} />
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
    const FileItem = ({ file }: { file: ExtendedFile }) => {
        // 元のFileオブジェクトかExtendedFileから適切なプロパティを取得
        const originalFile = file.originalFile || file;
        const fileName = originalFile.name || file.name || '不明なファイル';
        const fileSize = originalFile.size || file.size || 0;

        return (
            <li className="flex items-center py-2 px-3 hover:bg-gray-50">
                <DocumentIcon className="h-5 w-5 mr-2 text-gray-400" />
                <span className="truncate flex-grow">{fileName}</span>
                <span className="text-sm text-gray-500 mx-2">
                    {formatFileSize(fileSize)}
                </span>
            </li>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex mb-4 border-b">
                <button
                    className={`px-4 py-2 ${uploadMode === 'files' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-600'}`}
                    onClick={() => setUploadMode('files')}
                >
                    ファイルをアップロード
                </button>
                <button
                    className={`px-4 py-2 ${uploadMode === 'folder' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-600'}`}
                    onClick={() => setUploadMode('folder')}
                >
                    フォルダをアップロード
                </button>
            </div>

            {validationError && (
                <div className={`${validationErrorType === 'error'
                    ? 'bg-red-50 border-2 border-red-400 text-red-700'
                    : 'bg-yellow-50 border-2 border-yellow-400 text-yellow-700'} 
                    px-4 py-3 rounded mb-4 whitespace-pre-line font-medium`}>
                    <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{validationErrorType === 'error' ? 'エラー' : '注意'}</span>
                    </div>
                    <div className="mt-1">{validationError}</div>
                </div>
            )}

            {uploadMode === 'files' ? (
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
                            <p className="text-sm text-gray-500 mt-1">最大サイズ: 50MB、あらゆるファイル形式に対応</p>
                            <p className="text-sm text-gray-500">※フォルダごとアップロードする場合は、上部の「フォルダをアップロード」タブを選択してください</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <input
                        type="file"
                        // @ts-expect-error: webkitdirectoryは標準のHTMLAttributeではないが、ブラウザでは動作する
                        webkitdirectory="true"
                        // @ts-expect-error: directoryも標準のHTMLAttributeではないが、ブラウザでは動作する
                        directory=""
                        multiple
                        onChange={handleFolderSelect}
                        className="hidden"
                        id="folder-input"
                    />
                    <label
                        htmlFor="folder-input"
                        className="cursor-pointer block w-full h-full"
                    >
                        <div>
                            <p>クリックしてフォルダを選択してください</p>
                            <p className="text-sm text-gray-500 mt-1">フォルダ内のすべてのファイル（サブフォルダ含む）がアップロードされます</p>
                            <p className="text-sm text-gray-500">フォルダ構造は保持されます</p>
                            <p className="text-sm text-gray-500 text-red-500">※空のフォルダはブラウザの制限により検出されません</p>
                        </div>
                    </label>
                </div>
            )}

            {files.length > 0 && (
                <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">選択済みファイル ({files.length})</h3>

                    <div>
                        <RenderFolder folder={folderStructure} path="" />
                    </div>

                    <div className="mt-4 bg-yellow-50 p-3 rounded-md text-sm text-yellow-700">
                        <p className="font-medium">注意</p>
                        <p>新たにアップロードすると今アップロードしているファイルはすべて置き換えられます</p>
                        <p className="mt-1">一度にファイル選択をしアップロードするか、フォルダごとアップロードしましょう</p>
                    </div>
                </div>
            )}
        </div>
    );
} 