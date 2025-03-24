/**
 * UUID形式に基づいてslugを生成するユーティリティ関数
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * 新しいUUIDを生成し、そこから「3D-PRINTER-MODEL-DATA-{uuidの8桁-4桁}」形式のslugを作成する
 * @returns {object} 生成されたUUIDとslugのオブジェクト
 */
export function generateIdAndSlug() {
  // 新しいUUIDを生成
  const uuid = uuidv4();
  
  // UUIDを分割して最初の8桁と次の4桁を取得
  const uuidParts = uuid.split('-');
  const firstPart = uuidParts[0];           // 例: 39dab4d8（8桁）
  const secondPart = uuidParts[1].substring(0, 4); // 例: f600（4桁）
  
  // 指定された形式でslugを作成
  const slug = `3D-PRINTER-MODEL-DATA-${firstPart}-${secondPart}`;
  
  return {
    id: uuid,
    slug: slug
  };
}

/**
 * 既存のUUIDから「3D-PRINTER-MODEL-DATA-{uuidの8桁-4桁}」形式のslugを生成する
 * @param uuid 既存のUUID
 * @returns {string} フォーマット済みのslug
 */
export function generateSlugFromId(uuid: string): string {
  // UUIDが無効な場合は新しく生成
  if (!uuid || uuid.split('-').length < 2) {
    const { slug } = generateIdAndSlug();
    return slug;
  }
  
  // UUIDを分割して最初の8桁と次の4桁を取得
  const uuidParts = uuid.split('-');
  const firstPart = uuidParts[0];           // 例: 39dab4d8
  const secondPart = uuidParts[1].substring(0, 4); // 例: f600
  
  return `3D-PRINTER-MODEL-DATA-${firstPart}-${secondPart}`;
} 