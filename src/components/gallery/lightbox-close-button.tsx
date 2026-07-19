import { X } from 'lucide-solid'
import { cva } from '~/cva.config'

const closeButtonVariants = cva({
  base: 'rounded-full transition-colors',
  variants: {
    variant: {
      floating:
        'bg-black/40 p-2.5 text-white/80 ring-1 ring-white/10 backdrop-blur-sm hover:bg-black/60 hover:text-white hover:ring-white/20',
      compact: 'p-1.5 text-white/60 hover:text-white',
    },
  },
  defaultVariants: {
    variant: 'floating',
  },
})

interface LightboxCloseButtonProps {
  onClick: () => void
  variant?: 'floating' | 'compact'
  class?: string
}

/**
 * The lightbox's one close button — a single component covering both the
 * floating variant (normal, height-abundant layout) and the compact variant
 * (short viewport's slim bar), which used to be two separate implementations.
 */
export function LightboxCloseButton(props: LightboxCloseButtonProps) {
  return (
    <button
      type="button"
      onClick={() => props.onClick()}
      aria-label="Luk"
      class={closeButtonVariants({
        variant: props.variant,
        class: props.class,
      })}
    >
      <X size={props.variant === 'compact' ? 18 : 22} />
    </button>
  )
}
