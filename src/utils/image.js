// Image downscaling/compression helpers. Storing full-resolution photos as
// base64 in the catalog JSON bloats every page load (the whole catalog is
// fetched up front), so every uploaded image is shrunk to a sensible size and
// re-encoded as JPEG before it's saved.

// Core: draw an <img> onto a canvas at a capped width and return a JPEG data URL.
function renderToJpeg(img, maxWidth, quality) {
  const scale = Math.min(1, maxWidth / (img.naturalWidth || maxWidth))
  const w = Math.max(1, Math.round((img.naturalWidth || maxWidth) * scale))
  const h = Math.max(1, Math.round((img.naturalHeight || maxWidth) * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', quality)
}

// Downscale + compress an uploaded image File to a JPEG data-URL.
// Returns a Promise<string> (data URL) or rejects on failure.
export function downscaleImage(file, maxWidth = 1000, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read failed'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('decode failed'))
      img.onload = () => resolve(renderToJpeg(img, maxWidth, quality))
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

// Re-compress an existing data-URL (used to shrink images already saved at full
// size). Returns a Promise<string>.
export function downscaleDataUrl(dataUrl, maxWidth = 1000, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onerror = () => reject(new Error('decode failed'))
    img.onload = () => resolve(renderToJpeg(img, maxWidth, quality))
    img.src = dataUrl
  })
}

// Convenience: shrink only if the value is a base64 image data-URL; pass http(s)
// URLs and empty values through unchanged. Never throws.
export async function shrinkIfDataUrl(value, maxWidth = 1000, quality = 0.82) {
  if (typeof value !== 'string' || !value.startsWith('data:image')) return value
  try {
    return await downscaleDataUrl(value, maxWidth, quality)
  } catch {
    return value
  }
}
