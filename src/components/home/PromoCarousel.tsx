import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { promoSlides } from '../../data/promotions'

const AUTO_ADVANCE_MS = 2500
const LOOP_RESET_MS = 750

export function PromoCarousel() {
  const count = promoSlides.length
  const displaySlides =
    count > 1 ? [...promoSlides, promoSlides[0]] : promoSlides
  const [position, setPosition] = useState(0)
  const [withoutTransition, setWithoutTransition] = useState(false)

  useEffect(() => {
    if (count <= 1) {
      return
    }

    const interval = window.setInterval(() => {
      setPosition((current) => (current >= count ? current : current + 1))
    }, AUTO_ADVANCE_MS)

    return () => window.clearInterval(interval)
  }, [count])

  useEffect(() => {
    if (position !== count) {
      return
    }

    const timeout = window.setTimeout(() => {
      setWithoutTransition(true)
      setPosition(0)

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setWithoutTransition(false))
      })
    }, LOOP_RESET_MS)

    return () => window.clearTimeout(timeout)
  }, [position, count])

  return (
    <section
      className="promo-carousel"
      aria-roledescription="carrossel"
      aria-label="Destaques da loja"
    >
      <div className="promo-carousel__viewport">
        <div
          className="promo-carousel__track"
          style={{
            transform: `translateX(-${position * 100}%)`,
            transition: withoutTransition ? 'none' : undefined,
          }}
        >
          {displaySlides.map((slide, index) => {
            const isActive = index === position

            return (
              <article
                key={`${slide.id}-${index}`}
                className="promo-slide promo-slide--image"
                aria-hidden={!isActive}
                style={
                  slide.mobileImage
                    ? ({
                        '--promo-mobile-image': `url(${slide.mobileImage})`,
                      } as CSSProperties)
                    : undefined
                }
              >
                <Link
                  to={slide.ctaTo}
                  className="promo-slide__image-link"
                  aria-label={slide.ctaLabel}
                  tabIndex={isActive ? 0 : -1}
                >
                  <picture>
                    {slide.mobileImage ? (
                      <source
                        media="(max-width: 760px)"
                        srcSet={slide.mobileImage}
                      />
                    ) : null}
                    <img
                      src={slide.image}
                      alt={slide.imageAlt ?? ''}
                      width={1920}
                      height={480}
                      loading="eager"
                      decoding="async"
                      fetchPriority="high"
                      className="promo-slide__image"
                    />
                  </picture>
                  <span className="promo-slide__image-shade" aria-hidden="true" />
                </Link>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
