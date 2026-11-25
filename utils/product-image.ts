import sharp from 'sharp';
export const maxProductImageBytes = 8 * 1024 * 1024;
export async function normalizeProductImage(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > maxProductImageBytes || !file.size)
        throw new Error('JPEG・PNG・WebP（8MB以内）の画像を選択してください。');
    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const image = sharp(buffer, { limitInputPixels: 40000000, animated: false });
        const meta = await image.metadata();
        if (!['jpeg','png','webp'].includes(meta.format || '') || (meta.pages ?? 1) > 1) throw new Error('形式が不正です');
        const output = await image.rotate().resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80, effort: 4 }).toBuffer();
        if (output.length > 2097152) throw new Error('圧縮できませんでした');
        return output;
    } catch {
        throw new Error('画像を読み込めません。JPEG・PNG・WebPの静止画像を選択してください。');
    }
}
