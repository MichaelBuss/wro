import type { JSX } from 'solid-js'
import { cva } from '~/cva.config'

export type NavArrowDirection = 'prev' | 'next'

const navArrowVariants = cva({
  base: 'transition-opacity duration-200',
  variants: {
    disabled: {
      true: 'text-white/20 cursor-not-allowed',
      false: 'text-white/60 hover:text-white cursor-pointer',
    },
  },
  defaultVariants: {
    disabled: false,
  },
})

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
      class={navArrowVariants({ disabled: props.disabled, class: props.class })}
    >
      <svg
        class="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
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
