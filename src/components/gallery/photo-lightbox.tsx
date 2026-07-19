import { useNavigate, useRouter } from '@tanstack/solid-router'
import { createSignal, onCleanup, onMount } from 'solid-js'
import type { GalleryItem } from '~/components/ui'
import { cx } from '~/cva.config'
import type { WindowControlSide } from '~/lib/platform'
import { windowControlSide } from '~/lib/platform'
import { galleryTransitionTypes } from '~/lib/view-transitions'
import { LightboxCaption } from './lightbox-caption'
import { LightboxCloseButton } from './lightbox-close-button'
import { LightboxPagination } from './lightbox-pagination'

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

  const [controlSide, setControlSide] = createSignal<WindowControlSide>('right')

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
    setControlSide(windowControlSide(navigator.userAgent))

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
      class="fixed inset-0 z-50 grid grid-rows-[auto_1fr_auto] bg-black/95 pt-safe pr-safe pb-safe pl-safe outline-none compact-wide:grid-cols-[1fr_auto]"
    >
      {/* Its own top row in the large/compact-tall shapes; in compact-wide
          it moves into the side chrome column instead, sitting above the
          pagination+caption block that shares that column. Single instance
          throughout — only its grid placement changes per mode. */}
      <LightboxCloseButton
        onClick={close}
        variant="floating"
        class={cx(
          'row-start-1 col-start-1 z-20 m-4 justify-self-end compact-tall:m-2 compact-wide:col-start-2 compact-wide:row-start-1 compact-wide:self-start compact-wide:justify-self-center',
          controlSide() === 'left' && 'justify-self-start',
        )}
      />

      {/* The image always owns its own grid cell — never shares one with
          the chrome — so there's no overlap to manage in any mode. In
          compact-wide it spans all 3 rows of its column since the chrome
          has moved to the other column entirely. */}
      <img
        src={props.item.src}
        srcset={props.item.srcset}
        sizes={props.item.sizes}
        alt={props.item.alt}
        class="col-start-1 row-start-2 min-h-0 max-h-full max-w-full justify-self-center self-center object-contain px-4 compact-tall:px-2 compact-wide:row-start-1 compact-wide:row-span-3 compact-wide:px-6"
        style={{ 'view-transition-name': `photo-${props.item.slug}` }}
      />

      {/* Pagination + caption, always rendered together in the dedicated
          chrome row (or, in compact-wide, the chrome column) below/beside
          the image — never an overlay on top of it. An inner grid (not
          flex) keeps the two stacked. */}
      <div
        class={cx(
          'lightbox-caption row-start-3 col-start-1 grid justify-items-center gap-2 px-6 py-6 text-center text-white/90',
          'compact-tall:gap-1 compact-tall:px-4 compact-tall:py-3',
          'compact-wide:col-start-2 compact-wide:row-start-2 compact-wide:row-span-2 compact-wide:self-center compact-wide:max-w-40 compact-wide:px-3 compact-wide:py-4',
        )}
      >
        <LightboxCaption
          caption={props.item.caption ?? props.eventLabel}
          location={props.eventLocation}
        />

        <LightboxPagination
          year={props.year}
          prevSlug={props.prevSlug}
          nextSlug={props.nextSlug}
          index={props.index}
          total={props.total}
        />
      </div>
    </div>
  )
}
