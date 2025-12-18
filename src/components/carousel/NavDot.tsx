import type { JSX } from 'solid-js'
import { cva } from '~/cva.config'

const navDotVariants = cva({
  base: 'w-2.5 h-2.5 rounded-full transition-all cursor-pointer',
  variants: {
    active: {
      true: 'bg-white scale-115',
      false: 'bg-white/40 hover:bg-white/80 hover:scale-105',
    },
  },
  defaultVariants: {
    active: false,
  },
})

interface NavDotProps {
  index: number
  isActive: boolean
  onClick: () => void
}

export function NavDot(props: NavDotProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => props.onClick()}
      class={navDotVariants({ active: props.isActive })}
      aria-label={`Gå til billede ${props.index + 1}`}
      aria-current={props.isActive ? 'true' : undefined}
    />
  )
}
