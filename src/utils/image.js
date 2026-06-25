// Downscale + compress an uploaded image File to a JPEG data-URL, so large
// photos don't blow past the localStorage quota (which white-pages the app).
// Returns a Promise<string> (data URL) or rejects on failure.
export function downscaleImage(file, maxWidth = 1000, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read failed'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('decode failed'))
      img.onload = () => {
        const scale = Math.min(1, maxWidth / (img.naturalWidth || maxWidth))
        const w = Math.max(1, Math.round((img.naturalWidth || maxWidth) * scale))
        const h = Math.max(1, Math.round((img.naturalHeight || maxWidth) * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
