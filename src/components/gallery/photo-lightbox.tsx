import { Link, useNavigate, useRouter } from '@tanstack/solid-router'
import { ChevronLeft, ChevronRight, X } from 'lucide-solid'
import { Show, onCleanup, onMount } from 'solid-js'
import type { GalleryItem } from '~/components/ui'
import { galleryTransitionTypes } from '~/lib/view-transitions'

interface PhotoLightboxProps {
  year: string
  item: GalleryItem
  eventLabel: string
  eventLocation: string | undefined
  prevSlug: string | undefined
  nextSlug: string | undefined
  index: number
  total: number
}

/**
 * Full-viewport lightbox rendered at `/galleri/$year/$slug`. Deliberately
 * *not* built on Kobalte's `Dialog` — its trigger-and-content-on-one-page
 * model would fight the View Transition for the same open/close animation,
 * since here the "trigger" is a link on a different route and the morph is
 * owned entirely by the browser's View Transition API. Instead this is a
 * plain `role="dialog"` with manual focus-on-mount, keyboard nav, and a
 * scroll lock — all cleaned up on unmount.
 */
export function PhotoLightbox(props: PhotoLightboxProps) {
  let dialogRef: HTMLDivElement | undefined
  const navigate = useNavigate()
  const router = useRouter()

  // Prefer returning the user to wherever they actually opened the lightbox
  // from (front page, year grid, ...) rather than a hardcoded destination.
  // Paging with prev/next below replaces history entries instead of pushing,
  // so this still lands on that original page after browsing several photos.
  // Falls back to the year album for direct links with no history to unwind.
  const close = () => {
    if (router.history.canGoBack()) {
      router.history.back()
      return
    }
    void navigate({ to: '/galleri/$year', params: { year: props.year } })
  }

  const goToPrev = () => {
    if (!props.prevSlug) return
    void navigate({
      to: '/galleri/$year/$slug',
      params: { year: props.year, slug: props.prevSlug },
      viewTransition: { types: () => galleryTransitionTypes(['slide-right']) },
      replace: true,
    })
  }

  const goToNext = () => {
    if (!props.nextSlug) return
    void navigate({
      to: '/galleri/$year/$slug',
      params: { year: props.year, slug: props.nextSlug },
      viewTransition: { types: () => galleryTransitionTypes(['slide-left']) },
      replace: true,
    })
  }

  onMount(() => {
    dialogRef?.focus()
    document.body.classList.add('overflow-hidden')

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowLeft') goToPrev()
      if (event.key === 'ArrowRight') goToNext()
    }
    window.addEventListener('keydown', handleKeydown)

    onCleanup(() => {
      document.body.classList.remove('overflow-hidden')
      window.removeEventListener('keydown', handleKeydown)
    })
  })

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={props.item.caption ?? props.item.alt}
      tabIndex={-1}
      class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 outline-none"
    >
      <button
        type="button"
        onClick={close}
        aria-label="Luk"
        class="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
      >
        <X size={28} />
      </button>

      <Show when={props.prevSlug}>
        {(slug) => (
          <Link
            to="/galleri/$year/$slug"
            params={{ year: props.year, slug: slug() }}
            viewTransition={{
              types: () => galleryTransitionTypes(['slide-right']),
            }}
            replace
            aria-label="Forrige billede"
            class="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors"
          >
            <ChevronLeft size={32} />
          </Link>
        )}
      </Show>

      <Show when={props.nextSlug}>
        {(slug) => (
          <Link
            to="/galleri/$year/$slug"
            params={{ year: props.year, slug: slug() }}
            viewTransition={{
              types: () => galleryTransitionTypes(['slide-left']),
            }}
            replace
            aria-label="Næste billede"
            class="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors"
          >
            <ChevronRight size={32} />
          </Link>
        )}
      </Show>

      <img
        src={props.item.src}
        srcset={props.item.srcset}
        sizes={props.item.sizes}
        alt={props.item.alt}
        class="max-h-[85vh] max-w-[90vw] object-contain"
        style={{ 'view-transition-name': `photo-${props.item.slug}` }}
      />

      <div class="lightbox-caption absolute bottom-6 left-0 right-0 flex flex-col items-center gap-1 px-6 text-center text-white/90">
        <Show when={props.item.caption ?? props.eventLabel}>
          <p class="font-serif italic text-sm-copy">
            {props.item.caption ?? props.eventLabel}
          </p>
        </Show>
        <Show when={props.eventLocation}>
          {(location) => <p class="text-caption text-white/50">{location()}</p>}
        </Show>
        <p class="text-caption text-white/60 font-mono">
          {props.index} / {props.total}
        </p>
      </div>
    </div>
  )
}
