// app/components/FileDownloader/components/ModelPreviewModal.tsx

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { createClientSupabase } from '@/lib/supabase-client';

interface ModelPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileData: {
        original_name: string;
        storage_path: string;
        storage_bucket: string;
    } | null;
    articleId: string;
}

// モデルのサイズに合わせてカメラ位置を自動調整するコンポーネント
function CameraAutoFit({ modelLoaded }: { modelLoaded: boolean }) {
    const { scene, camera } = useThree();
    // OrbitControlsの型エラーを修正
    const controlsRef = useRef<any>(null);
    // アニメーション変数を削除し、必要なものだけ残す
    const setupComplete = useRef(false); // 初期設定完了フラグ

    // モデルの中心を取得
    const getModelCenter = () => {
        const box = new THREE.Box3().setFromObject(scene);
        return box.getCenter(new THREE.Vector3());
    };

    // カメラを即座にモデルに合わせる（アニメーションなし）
    const setCameraToFitModel = () => {
        const box = new THREE.Box3().setFromObject(scene);
        if (box.isEmpty()) return false;

        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        // カメラ位置を計算
        const perspCamera = camera as THREE.PerspectiveCamera;
        const fov = perspCamera.fov * (Math.PI / 180);
        let distance = (maxDim / 2) / Math.tan(fov / 2) * 1.8;
        distance = Math.max(distance, 3);

        // カメラを少し斜め上から配置
        const cameraX = center.x + distance * 0.5;
        const cameraY = center.y + distance * 0.5;
        const cameraZ = center.z + distance;

        // カメラ位置を設定
        camera.position.set(cameraX, cameraY, cameraZ);
        camera.lookAt(center);

        // OrbitControlsの中心も更新
        if (controlsRef.current) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            controlsRef.current.target.copy(center);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            controlsRef.current.update();
        }

        console.log("カメラをモデルに合わせて配置しました");
        return true;
    };

    // モデルが読み込まれたらカメラを配置（アニメーションなし）
    useEffect(() => {
        if (!modelLoaded || setupComplete.current) return;

        // アニメーションなしで正しい位置に即座に配置
        if (setCameraToFitModel()) {
            setupComplete.current = true;
        }
    }, [modelLoaded, camera, scene]);

    // コントロールを参照として保存
    return (
        <OrbitControls
            ref={controlsRef}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={20}
            rotateSpeed={0.7}
            // マウスの水平移動を垂直回転に、垂直移動を水平回転にマッピング
            mouseButtons={{
                LEFT: THREE.MOUSE.ROTATE,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.PAN
            }}
            // デフォルトは正反対なので反転
            reverseOrbit={true}
            // 追加設定 - 極点での動作を制限
            minPolarAngle={Math.PI * 0.05} // 完全な真上を避ける
            maxPolarAngle={Math.PI * 0.95} // 完全な真下を避ける
            // 回転の一貫性向上
            enableDamping={true}
            dampingFactor={0.05}
        />
    );
}

// OBJモデル用コンポーネント
function OBJModel({
    url,
    onLoaded,
    onProgress,
    hidden = false
}: {
    url: string;
    onLoaded?: () => void;
    onProgress?: (percent: number) => void;
    hidden?: boolean
}) {
    const [model, setModel] = useState<THREE.Group | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const modelRef = useRef<THREE.Group | null>(null);
    const { scene } = useThree();
    const autoRotateRef = useRef<boolean>(true);
    const rotationStartTime = useRef(Date.now());

    // センタリングアニメーション関連のコードを削除

    useEffect(() => {
        // ローダーの初期化
        const loader = new OBJLoader();
        console.log("OBJモデルを読み込み開始:", url);

        // URLからモデルを読み込み
        loader.load(
            url,
            (obj: THREE.Group) => {
                console.log("OBJモデルのロード成功");

                // マテリアルを設定（もし必要なら）
                obj.traverse((child: THREE.Object3D) => {
                    if (child instanceof THREE.Mesh) {
                        // 影を受けるStandardマテリアルを使用
                        child.material = new THREE.MeshStandardMaterial({
                            color: 0xffffff,
                            roughness: 0.3,
                            metalness: 0.1
                        });
                        // 影の設定
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // モデルをシーンの原点に配置する（即座に中心に）
                const box = new THREE.Box3().setFromObject(obj);
                const center = box.getCenter(new THREE.Vector3());

                // モデルを中心に配置（アニメーションなし）
                obj.position.x = -center.x;
                obj.position.y = -center.y;
                obj.position.z = -center.z;

                // モデルのサイズを計算
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);

                // モデルサイズに基づいて自動スケーリング
                if (maxDim > 0) {
                    if (maxDim < 1) {
                        // 小さすぎる場合は拡大
                        const scale = 2 / maxDim;
                        obj.scale.set(scale, scale, scale);
                    } else if (maxDim > 10) {
                        // 大きすぎる場合は縮小
                        const scale = 5 / maxDim;
                        obj.scale.set(scale, scale, scale);
                    }
                }

                // モデルを保存
                modelRef.current = obj;
                setModel(obj);
                setLoading(false);

                // 自動回転開始タイマーをリセット
                rotationStartTime.current = Date.now();
                autoRotateRef.current = true;

                // モデルのロードが完了したのでコールバックを即時実行
                if (onLoaded) {
                    onLoaded();
                }

                // 5秒後に自動回転を停止
                setTimeout(() => {
                    autoRotateRef.current = false;
                }, 5000);
            },
            // 進捗イベント
            (xhr: { lengthComputable: boolean; loaded: number; total: number }) => {
                if (xhr.lengthComputable) {
                    const percent = Math.round((xhr.loaded / xhr.total) * 100);
                    console.log(`${percent}% loaded`);
                    if (onProgress) {
                        onProgress(percent);
                    }
                }
            },
            // エラーコールバック
            (err: unknown) => {
                console.error("OBJLoader エラー:", err);
                setError("モデルの読み込みに失敗しました");
                setLoading(false);

                // エラー時にもonLoadedを呼び出す
                if (onLoaded) {
                    onLoaded();
                }
            }
        );

        // クリーンアップ
        return () => {
            if (modelRef.current) {
                modelRef.current.traverse((child: THREE.Object3D) => {
                    if (child instanceof THREE.Mesh) {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(m => m.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    }
                });
                modelRef.current = null;
            }
        };
    }, [url, scene, onLoaded, onProgress]);

    // 自動回転の処理
    useFrame(() => {
        if (modelRef.current && autoRotateRef.current) {
            const elapsedTime = (Date.now() - rotationStartTime.current) / 1000;
            // 最初は速く、そして徐々に遅くなるように
            const rotationSpeed = 0.25 * Math.max(0.2, Math.exp(-elapsedTime * 0.2));

            // 宇宙遊泳のような複合的な回転運動
            // Y軸（水平方向）回転 - 基本の回転
            modelRef.current.rotation.y += rotationSpeed * 0.03;

            // X軸（縦方向）回転 - 緩やかな揺れ
            modelRef.current.rotation.x = Math.sin(elapsedTime * 0.4) * 0.1;

            // Z軸（傾き）回転 - より自然な浮遊感
            modelRef.current.rotation.z = Math.sin(elapsedTime * 0.3) * 0.05;

            // 位置も少し揺らして浮遊感を出す
            modelRef.current.position.y += Math.sin(elapsedTime * 0.5) * 0.001;
        }
    });

    if (hidden) {
        // ロード処理だけ行い、表示はしない
        return null;
    }

    if (error) {
        return (
            <mesh>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="red" />
                <Html position={[0, 0, 0]} center>
                    <div style={{
                        background: 'rgba(255,0,0,0.1)',
                        padding: '10px',
                        borderRadius: '4px',
                        color: 'black',
                        textAlign: 'center',
                        width: '200px'
                    }}>
                        {error}
                    </div>
                </Html>
            </mesh>
        );
    }

    if (loading || !model) {
        return null; // ローディング中は何も表示しない
    }

    return <primitive object={model} />;
}

// STLモデル用コンポーネント
function STLModel({
    url,
    onLoaded,
    onProgress,
    hidden = false
}: {
    url: string;
    onLoaded?: () => void;
    onProgress?: (percent: number) => void;
    hidden?: boolean
}) {
    const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [scale, setScale] = useState(1);
    const geometryRef = useRef<THREE.BufferGeometry | null>(null);
    const meshRef = useRef<THREE.Mesh | null>(null);
    const autoRotateRef = useRef<boolean>(true);
    const rotationStartTime = useRef(Date.now());

    // センタリングアニメーション関連のコードを削除

    useEffect(() => {
        const loader = new STLLoader();
        console.log("STLモデルを読み込み開始:", url);

        loader.load(
            url,
            (geometry: THREE.BufferGeometry) => {
                console.log("STLモデルのロード成功");

                // 中心を計算するため
                geometry.computeBoundingBox();
                const boundingBox = geometry.boundingBox;

                let computedScale = 1;

                if (boundingBox) {
                    // 中心をオフセットするためにジオメトリを移動（即座にセンタリング）
                    geometry.center();

                    // スケール調整のために寸法を計算
                    const size = new THREE.Vector3();
                    boundingBox.getSize(size);
                    const maxDim = Math.max(size.x, size.y, size.z);

                    // モデルのサイズに基づいてスケールを調整
                    if (maxDim > 0) {
                        // モデルが小さすぎる場合は拡大
                        if (maxDim < 1) {
                            computedScale = 2 / maxDim;
                        }
                        // モデルが大きすぎる場合は縮小
                        else if (maxDim > 10) {
                            computedScale = 5 / maxDim;
                        }
                    }
                }

                setScale(computedScale);
                geometryRef.current = geometry;
                setGeometry(geometry);
                setLoading(false);

                // 自動回転開始タイマーをリセット
                rotationStartTime.current = Date.now();
                autoRotateRef.current = true;

                // モデルのロードが完了したのでコールバックを即時実行
                if (onLoaded) {
                    onLoaded();
                }

                // 5秒後に自動回転を停止
                setTimeout(() => {
                    autoRotateRef.current = false;
                }, 5000);
            },
            // 進捗イベント
            (xhr: { lengthComputable: boolean; loaded: number; total: number }) => {
                if (xhr.lengthComputable) {
                    const percent = Math.round((xhr.loaded / xhr.total) * 100);
                    console.log(`${percent}% loaded`);
                    if (onProgress) {
                        onProgress(percent);
                    }
                }
            },
            // エラーコールバック
            (err: unknown) => {
                console.error("STLLoader エラー:", err);
                setError("モデルの読み込みに失敗しました");
                setLoading(false);

                // エラー時にもonLoadedを呼び出す
                if (onLoaded) {
                    onLoaded();
                }
            }
        );

        return () => {
            if (geometryRef.current) {
                geometryRef.current.dispose();
                geometryRef.current = null;
            }
        };
    }, [url, onLoaded, onProgress]);

    // 自動回転の処理
    useFrame(() => {
        if (meshRef.current && autoRotateRef.current) {
            const elapsedTime = (Date.now() - rotationStartTime.current) / 1000;
            // 最初は速く、そして徐々に遅くなるように
            const rotationSpeed = 0.25 * Math.max(0.2, Math.exp(-elapsedTime * 0.2));

            // 宇宙遊泳のような複合的な回転運動
            // Y軸（水平方向）回転 - 基本の回転
            meshRef.current.rotation.y += rotationSpeed * 0.03;

            // X軸（縦方向）回転 - 緩やかな揺れ
            meshRef.current.rotation.x = Math.sin(elapsedTime * 0.4) * 0.1;

            // Z軸（傾き）回転 - より自然な浮遊感
            meshRef.current.rotation.z = Math.sin(elapsedTime * 0.3) * 0.05;

            // 位置も少し揺らして浮遊感を出す
            meshRef.current.position.y += Math.sin(elapsedTime * 0.5) * 0.001;
        }
    });

    // メッシュが作成された後のアニメーション開始処理も削除

    if (hidden) {
        // ロード処理だけ行い、表示はしない
        return null;
    }

    if (error) {
        return (
            <mesh>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="red" />
                <Html position={[0, 0, 0]} center>
                    <div style={{
                        background: 'rgba(255,0,0,0.1)',
                        padding: '10px',
                        borderRadius: '4px',
                        color: 'black',
                        textAlign: 'center',
                        width: '200px'
                    }}>
                        {error}
                    </div>
                </Html>
            </mesh>
        );
    }

    if (loading || !geometry) {
        return null; // ローディング中は何も表示しない
    }

    return (
        <mesh
            ref={meshRef}
            geometry={geometry}
            scale={[scale, scale, scale]}
            castShadow
            receiveShadow
        >
            <meshStandardMaterial
                color={0xffffff}
                roughness={0.3}
                metalness={0.1}
            />
        </mesh>
    );
}

// キャンバスシーン
function ModelScene({ fileType, modelUrl }: { fileType: 'obj' | 'stl', modelUrl: string }) {
    const [modelLoaded, setModelLoaded] = useState(false);
    const [modelRendered, setModelRendered] = useState(false); // モデルが実際にレンダリングされたかどうか
    const modelLoadedRef = useRef(false); // モデルロード状態を監視する参照を追加
    // ロード進捗状況の状態を残すが、表示には使わない
    const [modelLoadProgress, setModelLoadProgress] = useState(0);

    // モデルがロードされたときに呼び出されるコールバック
    const handleModelLoaded = useCallback(() => {
        // すでにロード済みの場合は重複して処理しない
        if (modelLoadedRef.current) return;

        console.log("モデルのロードが完了しました");
        modelLoadedRef.current = true;
        setModelLoaded(true);

        // モデルがレンダリングされたことをすぐに設定（センタリングアニメーション不要）
        setModelRendered(true);
    }, []);

    // ロード進捗を処理するコールバック
    const handleLoadProgress = useCallback((percent: number) => {
        setModelLoadProgress(percent);
    }, []);

    // モデルURLが変わったときにリセット
    useEffect(() => {
        modelLoadedRef.current = false;
        setModelLoaded(false);
        setModelRendered(false);
        setModelLoadProgress(0);
        console.log("ModelScene: モデルURLが変更されました", modelUrl);
    }, [modelUrl]);

    return (
        <Canvas
            camera={{
                position: [2, 2, 5], // 初期位置を少し斜めに
                fov: 40,
                near: 0.1,
                far: 1000
            }}
            gl={{
                powerPreference: 'default',
                antialias: true,
                alpha: false
            }}
            shadows
        >
            <color attach="background" args={['#f0f0f0']} />
            <ambientLight intensity={0.7} />
            <directionalLight
                position={[5, 5, 5]}
                intensity={0.8}
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
                shadow-camera-far={50}
                shadow-camera-left={-10}
                shadow-camera-right={10}
                shadow-camera-top={10}
                shadow-camera-bottom={-10}
            />
            <directionalLight position={[-5, -5, -5]} intensity={0.3} />

            {!modelRendered && (
                <Html center>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '60px',
                        height: '60px'
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            border: '4px solid rgba(0, 0, 0, 0.1)',
                            borderTop: '4px solid #4285F4',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }} />
                        <style>
                            {`
                                @keyframes spin {
                                    0% { transform: rotate(0deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            `}
                        </style>
                    </div>
                </Html>
            )}

            <Suspense fallback={null}>
                {/* モデルはレンダリング可能状態の時のみ表示する */}
                {modelRendered && fileType === 'obj' && (
                    <OBJModel
                        key={modelUrl}
                        url={modelUrl}
                        onLoaded={handleModelLoaded}
                        onProgress={handleLoadProgress}
                    />
                )}
                {modelRendered && fileType === 'stl' && (
                    <STLModel
                        key={modelUrl}
                        url={modelUrl}
                        onLoaded={handleModelLoaded}
                        onProgress={handleLoadProgress}
                    />
                )}

                {/* ロード完了前でもモデルは非表示ですがロードは進める */}
                {!modelRendered && fileType === 'obj' && (
                    <OBJModel
                        key={modelUrl}
                        url={modelUrl}
                        onLoaded={handleModelLoaded}
                        onProgress={handleLoadProgress}
                        hidden
                    />
                )}
                {!modelRendered && fileType === 'stl' && (
                    <STLModel
                        key={modelUrl}
                        url={modelUrl}
                        onLoaded={handleModelLoaded}
                        onProgress={handleLoadProgress}
                        hidden
                    />
                )}
            </Suspense>

            <CameraAutoFit modelLoaded={modelLoaded} />
        </Canvas>
    );
}

export default function ModelPreviewModal({ isOpen, onClose, fileData, articleId }: ModelPreviewModalProps) {
    const [modelUrl, setModelUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fileType, setFileType] = useState<'obj' | 'stl'>('obj');
    const fetchedUrlRef = useRef<string | null>(null); // 重複フェッチを防ぐための参照

    useEffect(() => {
        if (!isOpen || !fileData) {
            // モーダルが閉じられたらリセット
            if (modelUrl) {
                setModelUrl(null);
                setLoading(true);
                fetchedUrlRef.current = null;
            }
            return;
        }

        // ファイルタイプを判定
        const fileName = fileData.original_name.toLowerCase();
        if (fileName.endsWith('.obj')) setFileType('obj');
        else if (fileName.endsWith('.stl')) setFileType('stl');
        else {
            setError('サポートされていないファイル形式です');
            return;
        }

        // 同じURLを再度フェッチしないようにチェック
        const storageKey = `${fileData.storage_bucket}/${fileData.storage_path}`;

        if (fetchedUrlRef.current === storageKey) {
            console.log("既にフェッチ済みのURLです、スキップします:", storageKey);
            return;
        }

        // URLをフェッチするのは一度だけ
        const fetchModelUrl = async () => {
            setLoading(true);
            setError(null);
            try {
                console.log("モデルURLをフェッチ中:", storageKey);

                // Supabaseクライアントを取得
                const supabase = createClientSupabase();

                // 公開URLを取得
                const { data } = supabase.storage
                    .from(fileData.storage_bucket)
                    .getPublicUrl(fileData.storage_path);

                console.log("取得したモデルの公開URL:", data.publicUrl);
                setModelUrl(data.publicUrl);
                fetchedUrlRef.current = storageKey;
            } catch (err) {
                console.error("モデルURLの取得に失敗:", err);
                setError("モデルデータの取得に失敗しました");
                fetchedUrlRef.current = null;
            } finally {
                setLoading(false);
            }
        };

        fetchModelUrl();
    }, [isOpen, fileData, articleId, modelUrl]);

    // クリックイベントハンドラー
    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
            onClick={handleOverlayClick}
        >
            <div
                className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col"
                onClick={e => e.stopPropagation()} // モーダル内のクリックは伝播させない
            >
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-medium">
                        {fileData?.original_name || '3Dモデルプレビュー'}
                    </h3>
                    <button
                        onClick={() => {
                            onClose();
                        }}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 relative">
                    {(loading || !modelUrl) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                    )}

                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-red-100 text-red-700 p-4 rounded-md">
                                {error}
                            </div>
                        </div>
                    )}

                    {modelUrl && !loading && !error && (
                        <ModelScene fileType={fileType} modelUrl={modelUrl} />
                    )}
                </div>

                <div className="p-4 bg-gray-50 border-t">
                    <div className="text-sm text-gray-500">
                        <p>マウスでドラッグして回転 / スクロールでズーム</p>
                        <p className="text-xs text-yellow-600 mt-1">※ 初めての表示には時間がかかる場合があります</p>
                    </div>
                </div>
            </div>
        </div>
    );
}