import {
  For,
  Show,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js'
import { CarouselNav } from './CarouselNav'
import type { Accessor, JSX, ParentProps } from 'solid-js'
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

interface CarouselProps extends ParentProps {
  images: Array<CarouselImage>
  /** Optional class for the carousel container */
  class?: string
  /** Optional color tint overlay (any CSS color value) */
  tint?: string
}

export function Carousel(props: CarouselProps): JSX.Element {
  let carouselRef: HTMLDivElement | undefined
  const [currentSlide, setCurrentSlide] = createSignal(0)

  const totalSlides: Accessor<number> = createMemo(() => props.images.length)

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

  const scrollPrev = () => {
    if (!carouselRef) return
    carouselRef.scrollBy({ left: -carouselRef.clientWidth, behavior: 'smooth' })
  }

  const scrollNext = () => {
    if (!carouselRef) return
    carouselRef.scrollBy({ left: carouselRef.clientWidth, behavior: 'smooth' })
  }

  const scrollTo = (index: number) => {
    if (!carouselRef) return
    carouselRef.scrollTo({
      left: index * carouselRef.clientWidth,
      behavior: 'smooth',
    })
  }

  return (
    <section
      class={`isolate grid grid-rows-fr-min h-[60vh] min-h-[400px] max-h-[700px] ${props.class ?? ''}`}
    >
      {/* Slides - full bleed (both rows), base layer */}
      <div
        ref={carouselRef}
        class="row-span-full col-start-1 flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide"
      >
        <For each={props.images}>
          {(image, index) => (
            <div class="flex-none w-full h-full snap-start snap-always relative">
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
                style={{ 'object-position': image.objectPosition ?? 'center' }}
              />
              {/* Color tint overlay */}
              <Show when={props.tint}>
                <div
                  class="absolute inset-0"
                  style={{
                    'background-color': props.tint,
                    'mix-blend-mode': 'color',
                  }}
                />
              </Show>
              {/* Dark overlay for readability - always render to avoid hydration mismatch */}
              <div class="absolute inset-0 bg-linear-to-t from-slate-900 via-slate-900/60 to-transparent" />
            </div>
          )}
        </For>
      </div>

      <div class="row-start-1 col-start-1 place-items-center grid pointer-events-none z-10">
        <div class="text-center px-6 pointer-events-auto">{props.children}</div>
      </div>

      {/* Navigation */}
      <CarouselNav
        totalSlides={totalSlides()}
        currentSlide={currentSlide()}
        onPrev={scrollPrev}
        onNext={scrollNext}
        onGoTo={scrollTo}
      />
    </section>
  )
}
