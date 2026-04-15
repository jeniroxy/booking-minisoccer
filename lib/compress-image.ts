/**
 * Compress an image file to target size using canvas.
 * Returns a new File with JPEG compression.
 */
export async function compressImage(
  file: File,
  maxSizeKB = 35,
  maxDimension = 800
): Promise<File> {
  // If already small enough, return as-is
  if (file.size <= maxSizeKB * 1024) return file

  const bitmap = await createImageBitmap(file)
  let { width, height } = bitmap

  // Scale down if too large
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  // Try decreasing quality until under target size
  let quality = 0.7
  let blob = await canvas.convertToBlob({ type: 'image/jpeg', quality })

  while (blob.size > maxSizeKB * 1024 && quality > 0.1) {
    quality -= 0.1
    blob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
  }

  // If still too large, scale down further
  if (blob.size > maxSizeKB * 1024) {
    const scale = Math.sqrt((maxSizeKB * 1024) / blob.size)
    const w2 = Math.round(width * scale)
    const h2 = Math.round(height * scale)
    const canvas2 = new OffscreenCanvas(w2, h2)
    const ctx2 = canvas2.getContext('2d')!
    ctx2.drawImage(canvas, 0, 0, w2, h2)
    blob = await canvas2.convertToBlob({ type: 'image/jpeg', quality: 0.6 })
  }

  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
    type: 'image/jpeg',
  })
}
