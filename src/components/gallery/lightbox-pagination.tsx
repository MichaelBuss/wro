import { Link } from '@tanstack/solid-router'
import { ChevronLeft, ChevronRight } from 'lucide-solid'
import { Show } from 'solid-js'
import { galleryTransitionTypes } from '~/lib/view-transitions'

interface LightboxPaginationProps {
  year: string
  prevSlug: string | undefined
  nextSlug: string | undefined
  index: number
  total: number
}

/**
 * The "‹ 3 af 9 ›" pagination row — shared between the normal stacked
 * caption block and the compact short-viewport bar, so both stay in sync
 * instead of drifting into two copies of the same markup.
 */
export function LightboxPagination(props: LightboxPaginationProps) {
  return (
    <div class="flex items-center gap-3 font-mono text-caption text-white/60">
      <Show
        when={props.prevSlug}
        fallback={
          <span class="p-1.5 opacity-30" aria-hidden="true">
            <ChevronLeft size={16} />
          </span>
        }
      >
        {(slug) => (
          <Link
            to="/galleri/$year/$slug"
            params={{ year: props.year, slug: slug() }}
            viewTransition={{
              types: () => galleryTransitionTypes(['slide-right']),
            }}
            replace
            aria-label="Forrige billede"
            class="rounded-full p-1.5 text-white/60 transition-colors hover:text-white"
          >
            <ChevronLeft size={16} />
          </Link>
        )}
      </Show>

      <span>
        {props.index} af {props.total}
      </span>

      <Show
        when={props.nextSlug}
        fallback={
          <span class="p-1.5 opacity-30" aria-hidden="true">
            <ChevronRight size={16} />
          </span>
        }
      >
        {(slug) => (
          <Link
            to="/galleri/$year/$slug"
            params={{ year: props.year, slug: slug() }}
            viewTransition={{
              types: () => galleryTransitionTypes(['slide-left']),
            }}
            replace
            aria-label="Næste billede"
            class="rounded-full p-1.5 text-white/60 transition-colors hover:text-white"
          >
            <ChevronRight size={16} />
          </Link>
        )}
      </Show>
    </div>
  )
}
