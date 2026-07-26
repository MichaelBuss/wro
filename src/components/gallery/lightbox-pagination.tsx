import { Link } from '@tanstack/solid-router'
import { ChevronLeft, ChevronRight } from 'lucide-solid'
import { Show } from 'solid-js'

interface LightboxPaginationProps {
  year: string
  prevSlug: string | undefined
  nextSlug: string | undefined
  index: number
  total: number
  // Page via the lightbox's shared slide animation. Kept as real `<Link>`s
  // (correct href, cmd/middle-click opens the photo in a new tab) but a plain
  // click is intercepted to run the slide instead of an instant navigation.
  onPrev: () => void
  onNext: () => void
}

// A modified click (new tab, new window) should fall through to the browser;
// only a plain left-click gets the in-place slide.
function isPlainClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
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
            to="/gallery/$year/$slug"
            params={{ year: props.year, slug: slug() }}
            replace
            aria-label="Forrige billede"
            onClick={(event) => {
              if (!isPlainClick(event)) return
              event.preventDefault()
              props.onPrev()
            }}
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
            to="/gallery/$year/$slug"
            params={{ year: props.year, slug: slug() }}
            replace
            aria-label="Næste billede"
            onClick={(event) => {
              if (!isPlainClick(event)) return
              event.preventDefault()
              props.onNext()
            }}
            class="rounded-full p-1.5 text-white/60 transition-colors hover:text-white"
          >
            <ChevronRight size={16} />
          </Link>
        )}
      </Show>
    </div>
  )
}
