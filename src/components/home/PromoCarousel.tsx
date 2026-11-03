import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { promoSlides } from '../../data/promotions'
import type { PromoArt } from '../../data/promotions'
import { PerfumeBottleArt } from '../art/PerfumeBottleArt'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  FlowerIcon,
  LeafIcon,
  PauseIcon,
  PlayIcon,
} from '../icons/Icons'

function SlideArtwork({ art }: { art: PromoArt }) {
  return (
    <div className="promo-slide__art" aria-hidden="true">
      <span className="promo-slide__halo" />
      {art === 'bottle' ? (
        <PerfumeBottleArt className="promo-slide__bottle" />
      ) : null}
      {art === 'flower' ? (
        <FlowerIcon className="promo-slide__icon" width={280} height={280} />
      ) : null}
      {art === 'leaf' ? (
        <LeafIcon className="promo-slide__icon" width={280} height={280} />
      ) : null}
      <span className="promo-slide__monogram">NA</span>
    </div>
  )
}

export function PromoCarousel() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [manualPaused, setManualPaused] = useState(false)
  const count = promoSlides.length

  useEffect(() => {
    if (paused || manualPaused) {
      return
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const interval = window.setInterval(() => {
      setActive((current) => (current + 1) % count)
    }, 6500)

    return () => window.clearInterval(interval)
  }, [paused, manualPaused, count])

  function goTo(index: number) {
    setActive((index + count) % count)
  }

  return (
    <section
      className="promo-carousel"
      aria-roledescription="carrossel"
      aria-label="Destaques da loja"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false)
        }
      }}
    >
      <div className="promo-carousel__viewport">
        <div
          className="promo-carousel__track"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {promoSlides.map((slide, index) => {
            const isActive = index === active

            if (slide.image) {
              return (
                <article
                  key={slide.id}
                  className="promo-slide promo-slide--image"
                  aria-hidden={!isActive}
                >
                  <Link
                    to={slide.ctaTo}
                    className="promo-slide__image-link"
                    aria-label={slide.ctaLabel}
                    tabIndex={isActive ? 0 : -1}
                  >
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
                    <span className="promo-slide__image-shade" aria-hidden="true" />
                    <span className="promo-slide__image-caption">
                      <span className="btn btn--gold promo-slide__image-cta">
                        {slide.ctaLabel}
                        <ArrowRightIcon width={17} height={17} />
                      </span>
                    </span>
                  </Link>
                </article>
              )
            }

            return (
              <article
                key={slide.id}
                className={`promo-slide promo-slide--${slide.tone}`}
                aria-hidden={!isActive}
              >
                <div className="container promo-slide__inner">
                  <div className="promo-slide__content">
                    <p className="promo-slide__eyebrow">
                      <span aria-hidden="true" />
                      {slide.eyebrow}
                    </p>
                    <h2 className="promo-slide__title">{slide.title}</h2>
                    <p className="promo-slide__description">{slide.description}</p>
                    <Link
                      to={slide.ctaTo}
                      className={`btn ${
                        slide.tone === 'green' ? 'btn--gold' : 'btn--primary'
                      } promo-slide__cta`}
                      tabIndex={isActive ? 0 : -1}
                    >
                      {slide.ctaLabel}
                      <ArrowRightIcon width={17} height={17} />
                    </Link>
                  </div>

                  <SlideArtwork art={slide.art} />
                </div>
              </article>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        className="promo-carousel__arrow promo-carousel__arrow--prev"
        aria-label="Slide anterior"
        onClick={() => goTo(active - 1)}
      >
        <ArrowLeftIcon width={19} height={19} />
      </button>
      <button
        type="button"
        className="promo-carousel__arrow promo-carousel__arrow--next"
        aria-label="Próximo slide"
        onClick={() => goTo(active + 1)}
      >
        <ArrowRightIcon width={19} height={19} />
      </button>

      <div className="promo-carousel__footer">
        <span className="promo-carousel__count" aria-hidden="true">
          {String(active + 1).padStart(2, '0')}
          <span>/</span>
          {String(count).padStart(2, '0')}
        </span>
        <div className="promo-carousel__dots" role="group" aria-label="Selecionar banner">
          {promoSlides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-pressed={active === index}
              aria-label={`Ir para o banner ${index + 1}: ${slide.eyebrow}`}
              className={`promo-carousel__dot${
                active === index ? ' is-active' : ''
              }`}
              onClick={() => goTo(index)}
            />
          ))}
        </div>
        <button
          type="button"
          className="promo-carousel__pause"
          aria-label={
            manualPaused
              ? 'Retomar rotação automática dos banners'
              : 'Pausar rotação automática dos banners'
          }
          onClick={() => setManualPaused((current) => !current)}
        >
          {manualPaused ? (
            <PlayIcon width={13} height={13} />
          ) : (
            <PauseIcon width={13} height={13} />
          )}
        </button>
      </div>

    </section>
  )
}
