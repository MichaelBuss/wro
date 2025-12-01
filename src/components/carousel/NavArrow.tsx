import type { JSX } from 'solid-js'

export type NavArrowDirection = 'prev' | 'next'

interface NavArrowProps {
  direction: NavArrowDirection
  disabled?: boolean
  onClick: () => void
  class?: string
}

const arrowPaths: Record<NavArrowDirection, string> = {
  prev: 'M15 19l-7-7 7-7',
  next: 'M9 5l7 7-7 7',
}

const arrowLabels: Record<NavArrowDirection, string> = {
  prev: 'Forrige billede',
  next: 'Næste billede',
}

export function NavArrow(props: NavArrowProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      aria-label={arrowLabels[props.direction]}
      class={`transition-opacity duration-200 ${props.class ?? ''} ${
        props.disabled
          ? 'text-white/20 cursor-not-allowed'
          : 'text-white/60 hover:text-white cursor-pointer'
      }`}
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

