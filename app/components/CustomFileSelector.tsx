'use client';

import { useCallback, useState, useMemo, useEffect, useRef, memo } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    FolderIcon,
    DocumentIcon,
    ChevronRightIcon,
    ChevronDownIcon
} from '@heroicons/react/24/outline';

interface CustomFileSelectorProps {
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
    // 既存ファイル情報（編集時に使用）
    id?: string;
    storagePath?: string;
    isExisting?: boolean;
}

// フォルダ構造のインターフェース
interface FolderNode {
    name: string;
    path: string;
    files: ExtendedFile[];
    subfolders: Record<string, FolderNode>;
}

function CustomFileSelector({ onFilesSelected, onFilesDeleted, initialFiles = [] }: CustomFileSelectorProps) {
    const [files, setFiles] = useState<ExtendedFile[]>([]);
    const [uploadMode, setUploadMode] = useState<'files' | 'folder'>('files');
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const [validationError, setValidationError] = useState<string | null>(null);
    const [validationErrorType, setValidationErrorType] = useState<'error' | 'warning'>('error');
    const [folderStructure, setFolderStructure] = useState<FolderNode>({
        name: 'root',
        path: '',
        files: [],
        subfolders: {}
    });
    const [isFileListVisible, setIsFileListVisible] = useState(true);
    const [isFolderViewVisible, setIsFolderViewVisible] = useState(false);

    // initialFilesからExtendedFileへの変換
    const initialExtendedFiles = useMemo(() => {
        return initialFiles.map(file => {
            // ダミーのFileオブジェクトを作成
            const dummyFile = new File(
                [new Blob([''], { type: file.file_type || 'application/octet-stream' })],
                file.original_name,
                { type: file.file_type || 'application/octet-stream' }
            );

            // パスはそのまま保持（変換しない）
            const relativePath = file.path;

            return {
                originalFile: dummyFile,
                relativePath,
                name: file.original_name,
                size: file.file_size,
                type: file.file_type || '',
                id: file.id,            // 既存ファイル識別用
                storagePath: file.storage_path, // 既存ファイル削除用
                isExisting: true        // 既存ファイルフラグ
            } as ExtendedFile;
        });
    }, [initialFiles]);

    // フォルダ構造を構築する関数
    const updateFolderStructure = useCallback((fileList: ExtendedFile[]) => {
        const newStructure: FolderNode = {
            name: 'root',
            path: '',
            files: [],
            subfolders: {}
        };

        // ルートレベルのファイルを保持する配列
        const rootFiles: ExtendedFile[] = [];

        // 各ファイルを処理
        fileList.forEach(file => {
            // 相対パスが無いファイルはルートに配置
            if (!file.relativePath) {
                rootFiles.push(file);
                return;
            }

            // パスの部分を分解
            const folders = file.relativePath.split('/');
            const fileName = folders.pop() || ''; // 最後の部分（ファイル名）は除外

            // 現在処理中のフォルダ
            let currentFolder = newStructure;
            let currentPath = '';

            // 各フォルダレベルで処理
            folders.forEach((folder) => {
                // フォルダが作成済みでなければ作成
                currentPath = currentPath ? `${currentPath}/${folder}` : folder;

                if (!currentFolder.subfolders[folder]) {
                    currentFolder.subfolders[folder] = {
                        name: folder,
                        path: currentPath,
                        files: [],
                        subfolders: {}
                    };
                }

                currentFolder = currentFolder.subfolders[folder];
            });

            // 適切なフォルダにファイルを追加
            currentFolder.files.push(file);
        });

        // ルートレベルのファイルを追加
        newStructure.files = rootFiles;

        setFolderStructure(newStructure);
    }, []);

    // 初期化済みかどうかを追跡するref
    const isInitializedRef = useRef(false);

    // 初期ファイルがある場合はセット
    useEffect(() => {
        // 初期化済みなら何もしない
        if (isInitializedRef.current) {
            return;
        }

        if (initialExtendedFiles.length > 0) {
            isInitializedRef.current = true;
            setFiles(initialExtendedFiles);
            updateFolderStructure(initialExtendedFiles);

            // 第二階層までのフォルダを展開状態に設定
            const folderPaths = new Set<string>();
            initialExtendedFiles.forEach(file => {
                if (file.relativePath) {
                    const parts = file.relativePath.split('/');

                    // 第一階層のフォルダを追加
                    if (parts.length > 0) {
                        folderPaths.add(parts[0]);
                    }

                    // 第二階層のフォルダを追加（存在する場合）
                    if (parts.length > 1) {
                        folderPaths.add(`${parts[0]}/${parts[1]}`);
                    }
                }
            });

            // 展開状態を更新（第二階層まで）
            const expandedState: Record<string, boolean> = {};
            folderPaths.forEach(path => {
                expandedState[path] = true;
            });
            setExpandedFolders(expandedState);

            // 親コンポーネントにファイル選択を通知（Fileオブジェクトのみを渡す）
            onFilesSelected(initialExtendedFiles.map(f => f.originalFile));
        }
    }, [initialExtendedFiles, onFilesSelected, updateFolderStructure]);

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
            const relativePath = (file as any).webkitRelativePath || '';
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

            const relativePath = (file as any).webkitRelativePath || '';
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

            return true; // 問題ないファイルは保持
        });

        // ファイル名のバリデーション
        const invalidFiles: { name: string, reason: string }[] = [];
        const validFiles = filteredFiles.filter(file => {
            const validation = validateFileName(file.name);
            if (!validation.valid && validation.reason) {
                invalidFiles.push({ name: file.name, reason: validation.reason });
                return false;
            }
            return true;
        });

        // エラーメッセージの設定
        if (detectedSystemFolder && systemFolderFiles.length > 0) {
            // システムフォルダが検出された場合
            setValidationError(`"${detectedSystemFolder}" を含むパスのファイル(${systemFolderFiles.length}件)はシステム関連フォルダのためアップロードできませんので除外しました`);
            setValidationErrorType('warning');
        } else if (detectedSystemFiles.length > 0) {
            // システムファイルが検出された場合
            setValidationError(`システムファイル "${detectedSystemFiles.join('", "')}" が検出されたため除外しました`);
            setValidationErrorType('warning');
        } else if (hasLongPathWarning) {
            setValidationError(`一部のファイルパスが長すぎます(${MAX_PATH_LENGTH}文字超)。もっと浅い階層でフォルダを作成してください。`);
            setValidationErrorType('warning');
        } else if (invalidFiles.length > 0) {
            // 無効なファイルがある場合
            const errorMessages = invalidFiles.map(f => `・${f.name}: ${f.reason}`).join('\n');
            setValidationError(`以下のファイルはアップロードできません:\n${errorMessages}`);
            setValidationErrorType('error');
        } else {
            // エラーがなければクリア
            setValidationError(null);
        }

        if (validFiles.length === 0) {
            return; // 有効なファイルがなければ終了
        }

        // パス情報を持つExtendedFileオブジェクトに変換
        const extendedFiles = validFiles.map(file => {
            // パス情報を取得
            const relativePath = (file as any).webkitRelativePath || '';

            return {
                originalFile: file,
                relativePath: relativePath || '',
                preview: URL.createObjectURL(file),
                name: file.name,
                size: file.size,
                type: file.type
            };
        });

        // 既存ファイルを全て置き換える（上書きモード）
        setFiles(extendedFiles);
        updateFolderStructure(extendedFiles);

        // 親コンポーネントに通知
        onFilesSelected(validFiles);
    }, [validateFileName, updateFolderStructure, onFilesSelected]);

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
            const relativePath = (file as any).webkitRelativePath || '';
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

            const relativePath = (file as any).webkitRelativePath || '';
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

            return true; // 問題ないファイルは保持
        });

        // ファイル名のバリデーション
        const invalidFiles: { name: string, reason: string }[] = [];
        const validFiles = filteredFiles.filter(file => {
            const validation = validateFileName(file.name);
            if (!validation.valid && validation.reason) {
                invalidFiles.push({ name: file.name, reason: validation.reason });
                return false;
            }
            return true;
        });

        // エラーメッセージの設定
        if (detectedSystemFolder && systemFolderFiles.length > 0) {
            // システムフォルダが検出された場合
            setValidationError(`"${detectedSystemFolder}" を含むパスのファイル(${systemFolderFiles.length}件)はシステム関連フォルダのためアップロードできませんので除外しました`);
            setValidationErrorType('warning');
        } else if (detectedSystemFiles.length > 0) {
            // システムファイルが検出された場合
            setValidationError(`システムファイル "${detectedSystemFiles.join('", "')}" が検出されたため除外しました`);
            setValidationErrorType('warning');
        } else if (hasLongPathWarning) {
            setValidationError(`一部のファイルパスが長すぎます(${MAX_PATH_LENGTH}文字超)。もっと浅い階層でフォルダを作成してください。`);
            setValidationErrorType('warning');
        } else if (invalidFiles.length > 0) {
            // 無効なファイルがある場合
            const errorMessages = invalidFiles.map(f => `・${f.name}: ${f.reason}`).join('\n');
            setValidationError(`以下のファイルはアップロードできません:\n${errorMessages}`);
            setValidationErrorType('error');
        } else {
            // エラーがなければクリア
            setValidationError(null);
        }

        if (validFiles.length === 0) {
            return; // 有効なファイルがなければ終了
        }

        // 拡張ファイルオブジェクトを作成
        const extendedFiles = validFiles.map(file => {
            const relativePath = (file as any).webkitRelativePath || '';

            return {
                originalFile: file,
                relativePath,
                preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
                name: file.name,
                size: file.size,
                type: file.type
            };
        });

        // 既存ファイルを全て置き換える（上書きモード）
        setFiles(extendedFiles);
        updateFolderStructure(extendedFiles);

        // 親コンポーネントに通知
        onFilesSelected(validFiles);
    };

    // フォルダ構造を構築
    const computedFolderStructure = useMemo(() => {
        const rootFolder: FolderNode = {
            name: 'root',
            path: '',
            files: [],
            subfolders: {}
        };

        // ファイルを処理してフォルダ構造に組み込む
        files.forEach(file => {
            // パスがない場合はルートに追加
            if (!file.relativePath || file.relativePath === file.name) {
                rootFolder.files.push(file);
                return;
            }

            // パスの部分を分解
            const pathParts = file.relativePath.split('/');
            // 最後の部分（ファイル名）を除外
            if (pathParts.length > 0 && pathParts[pathParts.length - 1] === file.name) {
                pathParts.pop();
            }

            // 現在処理中のフォルダ
            let currentFolder = rootFolder;
            let currentPath = '';

            // パスを辿りながらフォルダ構造を構築
            for (const folder of pathParts) {
                if (!folder) continue; // 空のフォルダ名はスキップ

                // 現在のパスを更新
                currentPath = currentPath ? `${currentPath}/${folder}` : folder;

                // サブフォルダがなければ作成
                if (!currentFolder.subfolders[folder]) {
                    currentFolder.subfolders[folder] = {
                        name: folder,
                        path: currentPath,
                        files: [],
                        subfolders: {}
                    };
                }

                // 次のフォルダレベルへ移動
                currentFolder = currentFolder.subfolders[folder];
            }

            // 適切なフォルダにファイルを追加
            currentFolder.files.push(file);
        });

        return rootFolder;
    }, [files]);

    // ファイルとフォルダの合計数を計算
    const fileCount = files.length;

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

        // ルートフォルダの特別処理
        if (folder.name === 'root') {
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
                    {Object.entries(folder.subfolders).map(([folderName, subfolder]) => {
                        // 3D-PRINTER-DOWNLOAD-DATA- で始まるフォルダは特別処理
                        if (/^3D-PRINTER-DOWNLOAD-DATA-[a-f0-9]{8}-[a-f0-9]{4}$/i.test(folderName)) {
                            // フォルダ自体は表示せず、その中身を直接表示するが、
                            // サブフォルダには通常の開閉機能を持たせる
                            return (
                                <div key={subfolder.path}>
                                    {/* このフォルダ内のファイル */}
                                    {subfolder.files.length > 0 && (
                                        <ul className="divide-y border-t border-b mb-4">
                                            {subfolder.files.map((file, idx) => (
                                                <FileItem key={`special-${idx}`} file={file} />
                                            ))}
                                        </ul>
                                    )}

                                    {/* このフォルダ内のサブフォルダ - フォルダ操作UIを表示 */}
                                    {Object.entries(subfolder.subfolders).map(([subName, nestedFolder]) => {
                                        const nestedPath = nestedFolder.path;
                                        const isNestedExpanded = expandedFolders[nestedPath];

                                        return (
                                            <div key={nestedPath} className="mb-4">
                                                <div
                                                    className="flex items-center py-2 px-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                                                    onClick={() => toggleFolder(nestedPath)}
                                                >
                                                    {isNestedExpanded ? (
                                                        <ChevronDownIcon className="h-4 w-4 mr-1 text-gray-500" />
                                                    ) : (
                                                        <ChevronRightIcon className="h-4 w-4 mr-1 text-gray-500" />
                                                    )}
                                                    <FolderIcon className="h-5 w-5 mr-2 text-yellow-500" />
                                                    <span className="font-medium">{subName}</span>
                                                    <span className="ml-2 text-sm text-gray-500">
                                                        ({nestedFolder.files.length}ファイル
                                                        {Object.keys(nestedFolder.subfolders).length > 0 &&
                                                            `, ${Object.keys(nestedFolder.subfolders).length}フォルダ`})
                                                    </span>
                                                </div>

                                                {isNestedExpanded && (
                                                    <div className="pl-6 border-l ml-4 mt-2">
                                                        {/* サブフォルダのファイル */}
                                                        {nestedFolder.files.length > 0 && (
                                                            <ul className="divide-y border-t border-b mb-4">
                                                                {nestedFolder.files.map((file, index) => (
                                                                    <FileItem key={`${nestedPath}-${index}`} file={file} />
                                                                ))}
                                                            </ul>
                                                        )}

                                                        {/* 更に深いサブフォルダー */}
                                                        {Object.values(nestedFolder.subfolders).map(deepFolder => (
                                                            <RenderFolder
                                                                key={deepFolder.path}
                                                                folder={deepFolder}
                                                                path={deepFolder.path}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        }

                        // 通常のフォルダは普通に表示
                        return (
                            <RenderFolder
                                key={subfolder.path}
                                folder={subfolder}
                                path={subfolder.path}
                            />
                        );
                    })}
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
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">選択済みファイル ({files.length})</h3>
                        <button
                            type="button"
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            onClick={() => {
                                // 既存ファイルのIDを抽出
                                const existingFileIds = files
                                    .filter(file => file.isExisting && file.id)
                                    .map(file => file.id as string);

                                // 既存ファイルがあれば削除コールバックを呼び出し
                                if (existingFileIds.length > 0 && onFilesDeleted) {
                                    onFilesDeleted(existingFileIds);
                                }

                                // ファイルリストをクリア
                                setFiles([]);
                                setFolderStructure({
                                    name: 'root',
                                    path: '',
                                    files: [],
                                    subfolders: {}
                                });

                                // 親コンポーネントに空の配列を渡す
                                onFilesSelected([]);
                            }}
                        >
                            クリア
                        </button>
                    </div>

                    <div>
                        <RenderFolder folder={computedFolderStructure} path="" />
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

// memo化してエクスポート
export default memo(CustomFileSelector); 