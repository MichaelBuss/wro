import { For } from 'solid-js'
import type { JSX } from 'solid-js'
import { NavArrow } from './NavArrow'
import { NavDot } from './NavDot'

interface CarouselNavProps {
  totalSlides: number
  currentSlide: number
  onPrev: () => void
  onNext: () => void
  onGoTo: (index: number) => void
}

export function CarouselNav(props: CarouselNavProps): JSX.Element {
  const isAtStart = () => props.currentSlide === 0
  const isAtEnd = () => props.currentSlide >= props.totalSlides - 1

  return (
    <div class="row-start-2 col-start-1 justify-self-center z-10 pb-4 group/nav">
      <div class="flex items-center gap-3 px-6 py-2 rounded-full">
        <NavArrow
          direction="prev"
          onClick={props.onPrev}
          disabled={isAtStart()}
          class="opacity-0 group-hover/nav:opacity-100"
        />

        <div class="flex gap-2">
          <For each={Array.from({ length: props.totalSlides })}>
            {(_, index) => (
              <NavDot
                index={index()}
                isActive={props.currentSlide === index()}
                onClick={() => props.onGoTo(index())}
              />
            )}
          </For>
        </div>

        <NavArrow
          direction="next"
          onClick={props.onNext}
          disabled={isAtEnd()}
          class="opacity-0 group-hover/nav:opacity-100"
        />
      </div>
    </div>
  )
}
