import type { JSX } from 'solid-js'

export type CarouselArrowDirection = 'left' | 'right'

interface CarouselArrowProps {
  direction: CarouselArrowDirection
  onClick: () => void
  class?: string
}

const arrowPaths: Record<CarouselArrowDirection, string> = {
  left: 'M15 19l-7-7 7-7',
  right: 'M9 5l7 7-7 7',
}

const arrowLabels: Record<CarouselArrowDirection, string> = {
  left: 'Forrige billede',
  right: 'Næste billede',
}

const positionClasses: Record<CarouselArrowDirection, string> = {
  left: 'left-4',
  right: 'right-4',
}

export function CarouselArrow(props: CarouselArrowProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-label={arrowLabels[props.direction]}
      class={`absolute top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/60 hover:text-white transition-all cursor-pointer ${positionClasses[props.direction]} ${props.class ?? ''}`}
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d={arrowPaths[props.direction]}
        />
      </svg>
    </button>
  )
}

