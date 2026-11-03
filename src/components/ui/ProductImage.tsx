import { useState } from 'react'
import { BottleLineArt } from '../art/BottleLineArt'

interface ProductImageProps {
  src?: string
  alt: string
  className?: string
  eager?: boolean
}

export function ProductImage({
  src,
  alt,
  className = '',
  eager = false,
}: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = Boolean(src && failedSrc === src)

  if (!src || failed) {
    return (
      <div
        className={`image-placeholder ${className}`.trim()}
        role="img"
        aria-label={`${alt} — imagem em breve`}
      >
        <BottleLineArt className="image-placeholder__art" />
        <span className="image-placeholder__label">Imagem em breve</span>
      </div>
    )
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailedSrc(src)}
    />
  )
}
