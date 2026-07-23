import { useNavigate, useRouter } from '@tanstack/solid-router'
import { onCleanup, onMount } from 'solid-js'
import type { GalleryItem } from '~/components/ui'
import { cx } from '~/cva.config'
import { useSwipeNavigation } from '~/lib/use-swipe-navigation'
import { galleryTransitionTypes } from '~/lib/view-transitions'
import { LightboxCaption } from './lightbox-caption'
import { LightboxCloseButton } from './lightbox-close-button'
import { LightboxPagination } from './lightbox-pagination'

interface PhotoLightboxProps {
  year: string
  item: GalleryItem
  eventSlug: string
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

  // `skipViewTransition` is for the swipe gesture below: its own drag-to-exit
  // animation *is* the transition, so layering the router's slide+fade swoosh
  // on top would double up (and jump, since the swoosh only nudges 8% from
  // wherever the swipe already dragged the image to).
  const goToPrev = (options?: { skipViewTransition?: boolean }) => {
    if (!props.prevSlug) return
    void navigate({
      to: '/galleri/$year/$slug',
      params: { year: props.year, slug: props.prevSlug },
      viewTransition: options?.skipViewTransition
        ? false
        : { types: () => galleryTransitionTypes(['slide-right']) },
      replace: true,
    })
  }

  const goToNext = (options?: { skipViewTransition?: boolean }) => {
    if (!props.nextSlug) return
    void navigate({
      to: '/galleri/$year/$slug',
      params: { year: props.year, slug: props.nextSlug },
      viewTransition: options?.skipViewTransition
        ? false
        : { types: () => galleryTransitionTypes(['slide-left']) },
      replace: true,
    })
  }

  const swipe = useSwipeNavigation({
    canGoPrev: () => props.prevSlug !== undefined,
    canGoNext: () => props.nextSlug !== undefined,
    onCommitPrev: () => goToPrev({ skipViewTransition: true }),
    onCommitNext: () => goToNext({ skipViewTransition: true }),
  })

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
      class={cx(
        'fixed inset-0 z-50 grid grid-rows-[auto_1fr_auto] bg-black/95 pt-safe pr-safe pb-safe pl-safe outline-none',
        // Fully opaque on the space-tight phone layouts (the page bleeding
        // through the chrome gutter looked messy there); the roomier large
        // layout keeps its slightly-translucent scrim.
        'compact-wide:bg-black compact-tall:bg-black',
        // compact-wide: a fixed-width chrome column on the window-control side
        // (macOS left / Windows right, chosen by the <html data-controls>
        // attribute) + the image on the other. Fixed (not `auto`) so a photo's
        // aspect ratio can never nudge the chrome sideways between pages.
        'compact-wide:grid-rows-[auto_1fr]',
        'controls-left:compact-wide:grid-cols-[11rem_1fr]',
        'controls-right:compact-wide:grid-cols-[1fr_11rem]',
      )}
    >
      {/* Its own top row in the large/compact-tall shapes; in compact-wide it
          moves to the top corner of the chrome column (the window-control
          side). Single instance throughout — only its grid placement and
          alignment change per mode. */}
      <LightboxCloseButton
        onClick={close}
        variant="floating"
        class={cx(
          'row-start-1 col-start-1 z-20 m-4 compact-tall:m-2 compact-wide:self-start',
          'controls-left:justify-self-start controls-right:justify-self-end',
          'controls-right:compact-wide:col-start-2',
        )}
      />

      {/* The image always owns its own grid cell — never shares one with the
          chrome — so there's no overlap to manage in any mode. In compact-wide
          it fills the non-chrome column across both rows. The viewport-edge
          gutter has to live on this wrapper rather than the `<img>` itself —
          padding and `rounded-lg` on the same box would clip the rounding at
          the padded (outer) edge, leaving the photo's own corners square. */}
      <div
        ref={swipe.setContainer}
        class={cx(
          'col-start-1 row-start-2 flex min-h-0 min-w-0 touch-none items-center justify-center px-4 select-none compact-tall:px-2',
          'compact-wide:row-start-1 compact-wide:row-span-2 compact-wide:p-2',
          'controls-left:compact-wide:col-start-2',
          'controls-right:compact-wide:col-start-1',
        )}
        onPointerDown={swipe.onPointerDown}
        onPointerMove={swipe.onPointerMove}
        onPointerUp={swipe.onPointerUp}
        onPointerCancel={swipe.onPointerUp}
      >
        <img
          src={props.item.src}
          srcset={props.item.srcset}
          sizes={props.item.sizes}
          alt={props.item.alt}
          draggable={false}
          onTransitionEnd={swipe.onTransitionEnd}
          class="max-h-full max-w-full rounded-lg object-contain"
          style={{
            'view-transition-name': `photo-${props.item.slug}`,
            transform: `translateX(${swipe.offset()}px)`,
            transition: swipe.isDragging()
              ? 'none'
              : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </div>

      {/* Pagination + caption, always rendered together in the dedicated
          chrome row (large/compact-tall) or chrome column (compact-wide) —
          never an overlay on the image. In compact-wide this becomes a
          full-height [1fr auto auto] grid: caption + pager are grounded to
          the bottom of the column (like a native photo viewer's metadata)
          and edge-aligned to the window-control side. The pager is the last
          row, so its bottom edge is pinned to the column bottom and never
          moves across prev/next; a longer caption grows upward into the 1fr
          spacer above it. */}
      <div
        class={cx(
          'lightbox-caption row-start-3 col-start-1 grid justify-items-center gap-2 px-6 py-6 text-center text-white/90',
          'compact-tall:gap-1 compact-tall:px-4 compact-tall:py-3',
          'compact-wide:row-start-2 compact-wide:h-full compact-wide:grid-rows-[1fr_auto_1fr_auto] compact-wide:gap-0 compact-wide:px-5 compact-wide:py-6',
          'controls-left:compact-wide:col-start-1 controls-left:compact-wide:justify-items-start controls-left:compact-wide:text-left',
          'controls-right:compact-wide:col-start-2 controls-right:compact-wide:justify-items-end controls-right:compact-wide:text-right',
        )}
      >
        {/* Caption/location floats in the middle band between the close button
            (top of the column) and the pager (pinned to the bottom); the two
            1fr spacers keep it centred regardless of caption length. */}
        <div
          class={cx(
            'grid justify-items-center gap-1 compact-wide:row-start-2',
            'controls-left:compact-wide:justify-items-start',
            'controls-right:compact-wide:justify-items-end',
          )}
        >
          <LightboxCaption
            year={props.year}
            eventSlug={props.eventSlug}
            eventLabel={props.eventLabel}
            caption={props.item.caption}
            location={props.eventLocation}
          />
        </div>

        <div class="compact-wide:row-start-4">
          <LightboxPagination
            year={props.year}
            prevSlug={props.prevSlug}
            nextSlug={props.nextSlug}
            index={props.index}
            total={props.total}
          />
        </div>
      </div>
    </div>
  )
}
