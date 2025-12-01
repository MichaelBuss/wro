import { For, createSignal, onCleanup, onMount } from 'solid-js'
import { CarouselArrow } from './CarouselArrow'
import type { JSX, ParentProps } from 'solid-js'
import type { ObjectPosition } from '~/lib/images/alt-texts'

export type { ObjectPosition }

export interface CarouselImage {
  src: string
  srcset?: string
  sizes?: string
  alt: string
  /** Focal point for cropping. Defaults to 'center' */
  objectPosition?: ObjectPosition
}

interface HeroCarouselProps extends ParentProps {
  images: Array<CarouselImage>
}

export function HeroCarousel(props: HeroCarouselProps): JSX.Element {
  let carouselRef: HTMLDivElement | undefined
  const [currentSlide, setCurrentSlide] = createSignal(0)

  // Update current slide based on scroll position
  const handleScroll = () => {
    if (!carouselRef) return
    const scrollLeft = carouselRef.scrollLeft
    const slideWidth = carouselRef.clientWidth
    const newSlide = Math.round(scrollLeft / slideWidth)
    setCurrentSlide(newSlide)
  }

  onMount(() => {
    if (!carouselRef) return
    const ref = carouselRef
    ref.addEventListener('scroll', handleScroll, { passive: true })
    onCleanup(() => {
      ref.removeEventListener('scroll', handleScroll)
    })
  })

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef) return
    const scrollAmount = carouselRef.clientWidth
    carouselRef.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  const scrollToSlide = (index: number) => {
    if (!carouselRef) return
    carouselRef.scrollTo({
      left: index * carouselRef.clientWidth,
      behavior: 'smooth',
    })
  }

  const isAtStart = () => currentSlide() === 0
  const isAtEnd = () => currentSlide() >= props.images.length - 1

  return (
    <section class="group relative">
      {/* CSS Scroll-Snap Carousel */}
      <div
        ref={carouselRef}
        class="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide"
      >
        <For each={props.images}>
          {(image, index) => (
            <div
              id={`slide-${index()}`}
              class="flex-none w-full snap-start snap-always relative"
            >
              <div class="relative h-[60vh] min-h-[400px] max-h-[700px] w-full">
                {/* Placeholder gradient while image loads */}
                <div class="absolute inset-0 bg-linear-to-br from-slate-800 via-slate-700 to-slate-900" />
                <img
                  src={image.src}
                  srcset={image.srcset}
                  sizes={image.sizes}
                  alt={image.alt}
                  loading={index() === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchpriority={index() === 0 ? 'high' : 'low'}
                  class="absolute inset-0 w-full h-full object-cover"
                  style={{
                    'object-position': image.objectPosition ?? 'center',
                  }}
                />
                {/* Dark overlay for text readability */}
                <div class="absolute inset-0 bg-linear-to-t from-slate-900 via-slate-900/60 to-transparent" />
              </div>
            </div>
          )}
        </For>
      </div>

      {/* Scroll indicators */}
      <div class="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        <For each={props.images}>
          {(_, index) => (
            <button
              type="button"
              onClick={() => scrollToSlide(index())}
              class={`w-3 h-3 rounded-full transition-all cursor-pointer ${
                currentSlide() === index()
                  ? 'bg-white'
                  : 'bg-white/40 hover:bg-white/80'
              }`}
              aria-label={`Gå til billede ${index() + 1}`}
              aria-current={currentSlide() === index() ? 'true' : undefined}
            />
          )}
        </For>
      </div>

      {/* Navigation arrows - visible on hover */}
      <CarouselArrow
        direction="left"
        onClick={() => scrollCarousel('left')}
        disabled={isAtStart()}
        class="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      />
      <CarouselArrow
        direction="right"
        onClick={() => scrollCarousel('right')}
        disabled={isAtEnd()}
        class="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      />

      {/* Content overlay - always rendered */}
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div class="text-center px-6 pointer-events-auto">{props.children}</div>
      </div>
    </section>
  )
}
