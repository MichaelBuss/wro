import type { JSX } from 'solid-js'

interface NavDotProps {
  index: number
  isActive: boolean
  onClick: () => void
}

export function NavDot(props: NavDotProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={props.onClick}
      class={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
        props.isActive
          ? 'bg-white scale-115'
          : 'bg-white/40 hover:bg-white/80 hover:scale-105'
      }`}
      aria-label={`Gå til billede ${props.index + 1}`}
      aria-current={props.isActive ? 'true' : undefined}
    />
  )
}
