import { createLink } from '@tanstack/solid-router'
import { ArrowRight } from 'lucide-solid'
import type { ComponentProps } from 'solid-js'
import { splitProps } from 'solid-js'
import { cva } from '~/cva.config'

const cvaArrowLink = cva({
  base: 'inline-flex items-center gap-1.5 text-sm-copy font-medium transition-colors',
  variants: {
    variant: {
      default: 'text-primary hover:underline',
      onDark: 'text-white/60 hover:text-white',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

interface ArrowLinkAnchorProps extends ComponentProps<'a'> {
  variant?: 'default' | 'onDark'
}

function ArrowLinkAnchor(props: ArrowLinkAnchorProps) {
  const [local, rest] = splitProps(props, ['class', 'variant', 'children'])

  return (
    <a
      {...rest}
      class={cvaArrowLink({ variant: local.variant, class: local.class })}
    >
      <span>{local.children}</span>
      <ArrowRight size={14} class="shrink-0" />
    </a>
  )
}

/**
 * A text link with a trailing arrow, for "see more" style CTAs pointing to
 * a section's full page (e.g. "Se alle præmier →").
 *
 * Built via `createLink` so `to`/`params` stay fully typed against the
 * route tree, exactly like the base `Link` component.
 */
export const ArrowLink = createLink(ArrowLinkAnchor)
