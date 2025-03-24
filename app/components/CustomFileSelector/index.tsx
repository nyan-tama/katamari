'use client';

import { useCallback, useState, useEffect, useRef, memo } from 'react';
import { CustomFileSelectorProps, ExtendedFile, FolderNode, ValidationErrorType } from './types';
import { buildFolderStructure } from './utils/fileUtils';
import { filterFiles, createExtendedFiles, convertInitialFiles } from './utils/fileHandler';
import UploadTabs from './components/UploadTabs';
import ValidationError from './components/ValidationError';
import DropZone from './components/DropZone';
import FolderSelector from './components/FolderSelector';
import FileList from './components/FileList';

function CustomFileSelector({ onFilesSelected, onFilesDeleted, initialFiles = [] }: CustomFileSelectorProps) {
  const [files, setFiles] = useState<ExtendedFile[]>([]);
  const [uploadMode, setUploadMode] = useState<'files' | 'folder'>('files');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationErrorType, setValidationErrorType] = useState<ValidationErrorType>('error');
  const [folderStructure, setFolderStructure] = useState<FolderNode>({
    name: 'root',
    path: '',
    files: [],
    subfolders: {}
  });

  // 初期化済みかどうかを追跡するref
  const isInitializedRef = useRef(false);

  // 初期ファイルがある場合はセット
  useEffect(() => {
    // 初期化済みなら何もしない
    if (isInitializedRef.current) {
      return;
    }

    // 初期ファイルを変換
    const initialExtendedFiles = convertInitialFiles(initialFiles);

    if (initialExtendedFiles.length > 0) {
      isInitializedRef.current = true;
      setFiles(initialExtendedFiles);
      
      // フォルダ構造を更新
      const newStructure = buildFolderStructure(initialExtendedFiles);
      setFolderStructure(newStructure);

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
  }, [initialFiles, onFilesSelected]);

  // フォルダの開閉状態を切り替え
  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  }, []);

  // ファイルドロップ処理
  const handleFileDrop = useCallback((acceptedFiles: File[]) => {
    console.log('ドロップされたファイル一覧:');
    acceptedFiles.forEach(file => {
      console.log(`- ${file.name} (${file.size} bytes)`);
    });

    // ファイルをフィルタリング
    const {
      validFiles,
      invalidFiles,
      detectedSystemFolder,
      systemFolderFiles,
      detectedSystemFiles,
      hasLongPathWarning,
    } = filterFiles(acceptedFiles);

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
      setValidationError(`一部のファイルパスが長すぎます(250文字超)。もっと浅い階層でフォルダを作成してください。`);
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
    const extendedFiles = createExtendedFiles(validFiles);

    // 既存ファイルを全て置き換える（上書きモード）
    setFiles(extendedFiles);
    
    // フォルダ構造を更新
    const newStructure = buildFolderStructure(extendedFiles);
    setFolderStructure(newStructure);

    // 親コンポーネントに通知
    onFilesSelected(validFiles);
  }, [onFilesSelected]);

  // フォルダ選択処理
  const handleFolderSelect = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    if (!evt.target.files || evt.target.files.length === 0) return;

    const files = Array.from(evt.target.files);
    console.log('フォルダ選択されたファイル一覧:');
    files.forEach(file => {
      console.log(`- ${file.name} (${file.size} bytes)`);
    });

    // ファイルをフィルタリング
    const {
      validFiles,
      invalidFiles,
      detectedSystemFolder,
      systemFolderFiles,
      detectedSystemFiles,
      hasLongPathWarning,
    } = filterFiles(files);

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
      setValidationError(`一部のファイルパスが長すぎます(250文字超)。もっと浅い階層でフォルダを作成してください。`);
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
    const extendedFiles = createExtendedFiles(validFiles);

    // 既存ファイルを全て置き換える（上書きモード）
    setFiles(extendedFiles);
    
    // フォルダ構造を更新
    const newStructure = buildFolderStructure(extendedFiles);
    setFolderStructure(newStructure);

    // 親コンポーネントに通知
    onFilesSelected(validFiles);
  }, [onFilesSelected]);

  // ファイルのクリア処理
  const clearFiles = useCallback(() => {
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
  }, [files, onFilesDeleted, onFilesSelected]);

  return (
    <div className="space-y-4">
      <UploadTabs uploadMode={uploadMode} setUploadMode={setUploadMode} />

      <ValidationError errorMessage={validationError} errorType={validationErrorType} />

      {uploadMode === 'files' ? (
        <DropZone onDrop={handleFileDrop} />
      ) : (
        <FolderSelector onFolderSelect={handleFolderSelect} />
      )}

      <FileList 
        files={files}
        folderStructure={folderStructure}
        expandedFolders={expandedFolders}
        toggleFolder={toggleFolder}
        clearFiles={clearFiles}
      />
    </div>
  );
}

// memo化してエクスポート
export default memo(CustomFileSelector); 