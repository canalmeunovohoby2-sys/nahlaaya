export interface PreparedProductImage {
  base64: string
  contentType: string
  previewUrl: string
}

const MAX_SOURCE_BYTES = 8 * 1024 * 1024
const MAX_DIMENSION = 1400
const OUTPUT_CONTENT_TYPE = 'image/jpeg'

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Imagem inválida.'))
    image.src = source
  })
}

export async function prepareProductImage(
  file: File,
): Promise<PreparedProductImage> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Use uma imagem JPG, PNG ou WebP.')
  }

  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('A imagem original deve ter no máximo 8 MB.')
  }

  const source = await readFileAsDataUrl(file)
  const image = await loadImage(source)
  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight),
  )
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Não foi possível processar a imagem.')
  }

  context.drawImage(image, 0, 0, width, height)
  const previewUrl = canvas.toDataURL(OUTPUT_CONTENT_TYPE, 0.84)
  const base64 = previewUrl.split(',')[1] ?? ''

  if (!base64) {
    throw new Error('Não foi possível processar a imagem.')
  }

  return {
    base64,
    contentType: OUTPUT_CONTENT_TYPE,
    previewUrl,
  }
}
