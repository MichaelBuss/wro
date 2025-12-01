import { For } from 'solid-js'
import { CarouselArrow } from './CarouselArrow'
import type { JSX } from 'solid-js'

export interface CarouselImage {
  src: string
  alt: string
}

interface HeroCarouselProps {
  images: Array<CarouselImage>
  children?: JSX.Element
}

export function HeroCarousel(props: HeroCarouselProps): JSX.Element {
  let carouselRef: HTMLDivElement | undefined

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

  return (
    <section class="relative">
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
                  alt={image.alt}
                  loading={index() === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchpriority={index() === 0 ? 'high' : 'low'}
                  class="absolute inset-0 w-full h-full object-cover"
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
              class="w-3 h-3 rounded-full bg-white/40 transition-all hover:bg-white/80 hover:scale-125 cursor-pointer"
              aria-label={`Gå til billede ${index() + 1}`}
            />
          )}
        </For>
      </div>

      {/* Navigation arrows */}
      <CarouselArrow direction="left" onClick={() => scrollCarousel('left')} />
      <CarouselArrow
        direction="right"
        onClick={() => scrollCarousel('right')}
      />

      {/* Content overlay */}
      {props.children && (
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div class="text-center px-6 pointer-events-auto">
            {props.children}
          </div>
        </div>
      )}
    </section>
  )
}

