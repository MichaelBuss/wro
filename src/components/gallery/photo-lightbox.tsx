import { useNavigate, useRouter } from '@tanstack/solid-router'
import { createSignal, onCleanup, onMount } from 'solid-js'
import type { GalleryItem } from '~/components/ui'
import { cx } from '~/cva.config'
import { getPhotoLinkTarget } from '~/lib/gallery'
import type { LightboxAlbum } from '~/lib/gallery'
import { useSwipeNavigation } from '~/lib/use-swipe-navigation'
import { prefersReducedMotion } from '~/lib/view-transitions'
import { LightboxCaption } from './lightbox-caption'
import { LightboxCloseButton } from './lightbox-close-button'
import { LightboxPagination } from './lightbox-pagination'
import { LightboxPhotoPane } from './lightbox-photo-pane'

interface PhotoLightboxProps {
  // Which album prev/next/close page within — a single year or the
  // cross-year favourites collection. The caption breadcrumb below still
  // points at the photo's *own* year/event (via `item.yearKey`), regardless.
  album: LightboxAlbum
  item: GalleryItem
  eventSlug: string
  eventLabel: string
  eventLocation: string | undefined
  prevSlug: string | undefined
  nextSlug: string | undefined
  prevItem: GalleryItem | undefined
  nextItem: GalleryItem | undefined
  index: number
  total: number
}

// Breathing room between slides while swiping, so the incoming neighbour
// doesn't look glued to the edge of the one being dragged away. Baked into
// the track's `translateX` math below alongside its own `gap`.
const SWIPE_TRACK_GAP_PX = 16

// Safari doesn't have requestIdleCallback — a short timeout is a fine
// stand-in, since this is just "don't compete with the current photo's own
// fetch," not a hard scheduling requirement.
function onIdle(callback: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(callback)
    return () => window.cancelIdleCallback(id)
  }
  const id = window.setTimeout(callback, 200)
  return () => window.clearTimeout(id)
}

/**
 * Full-viewport lightbox rendered at `/gallery/$year/$slug`. Deliberately
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
    if (props.album.kind === 'favorites') {
      void navigate({ to: '/gallery/favorites' })
      return
    }
    void navigate({ to: '/gallery/$year', params: { year: props.album.year } })
  }

  // Every page turn — swipe, arrow key, or button — slides the photo track to
  // the neighbouring pane and only *then* navigates, with no view transition
  // layered on top: the slide already *is* the transition, and the browser's
  // slide+fade swoosh on top would double up (and jump, nudging its own 8%
  // from wherever the track already glided to). `commitPrev`/`commitNext`
  // drive that glide for the non-drag entry points below.
  const navigateToSlug = (slug: string) => {
    void navigate({
      ...getPhotoLinkTarget(props.album, slug),
      viewTransition: false,
      replace: true,
    })
  }

  const swipe = useSwipeNavigation({
    currentKey: () => props.item.slug,
    canGoPrev: () => props.prevSlug !== undefined,
    canGoNext: () => props.nextSlug !== undefined,
    onCommitPrev: () => {
      if (props.prevSlug !== undefined) navigateToSlug(props.prevSlug)
    },
    onCommitNext: () => {
      if (props.nextSlug !== undefined) navigateToSlug(props.nextSlug)
    },
  })

  // Neighbours start as just their colour placeholder (no network request)
  // and only fetch the real photo once this flips true — either once the
  // browser's idle, well after the current photo's own fetch has had a
  // head start, or immediately if the visitor starts swiping before that
  // idle callback ever fires.
  const [loadNeighbors, setLoadNeighbors] = createSignal(false)

  const handlePointerDown = (event: PointerEvent) => {
    setLoadNeighbors(true)
    swipe.onPointerDown(event)
  }

  // Buttons and arrow keys funnel through the swipe's own commit so they
  // share its slide. Neighbours are fetched first (a drag does this on
  // pointer-down) so the pane we glide to shows its photo, not a placeholder;
  // reduced-motion skips the glide and just navigates.
  const pagePrev = () => {
    if (props.prevSlug === undefined) return
    if (prefersReducedMotion()) {
      navigateToSlug(props.prevSlug)
      return
    }
    setLoadNeighbors(true)
    swipe.commitPrev()
  }
  const pageNext = () => {
    if (props.nextSlug === undefined) return
    if (prefersReducedMotion()) {
      navigateToSlug(props.nextSlug)
      return
    }
    setLoadNeighbors(true)
    swipe.commitNext()
  }

  onMount(() => {
    dialogRef?.focus()
    document.body.classList.add('overflow-hidden')

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowLeft') pagePrev()
      if (event.key === 'ArrowRight') pageNext()
    }
    window.addEventListener('keydown', handleKeydown)
    const cancelIdle = onIdle(() => setLoadNeighbors(true))

    onCleanup(() => {
      document.body.classList.remove('overflow-hidden')
      window.removeEventListener('keydown', handleKeydown)
      cancelIdle()
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
          gutter has to live on this wrapper rather than the panes themselves —
          padding and `rounded-lg` on the same box would clip the rounding at
          the padded (outer) edge, leaving each photo's own corners square.
          `overflow-hidden` clips the prev/next panes riding just outside it. */}
      <div
        ref={swipe.setContainer}
        class={cx(
          'col-start-1 row-start-2 flex min-h-0 min-w-0 touch-none items-center justify-center overflow-hidden px-4 select-none compact-tall:px-2',
          'compact-wide:row-start-1 compact-wide:row-span-2 compact-wide:p-2',
          'controls-left:compact-wide:col-start-2',
          'controls-right:compact-wide:col-start-1',
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={swipe.onPointerMove}
        onPointerUp={swipe.onPointerUp}
        onPointerCancel={swipe.onPointerUp}
      >
        {/* A 3-wide track — prev/current/next side by side — shifted so the
            current pane sits centred by default (`-100%` of its own width,
            i.e. one pane, *minus* the gap that sits before it — `gap` only
            adds space *between* flex children, not before the first one),
            with the live drag offset added on top. Dragging is just moving
            this one element; each pane itself is static. */}
        <div
          class="flex h-full w-full flex-none"
          style={{
            gap: `${SWIPE_TRACK_GAP_PX}px`,
            transform: `translateX(calc(-100% - ${SWIPE_TRACK_GAP_PX}px + ${swipe.offset()}px))`,
            transition:
              swipe.isDragging() || swipe.snapping()
                ? 'none'
                : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
          onTransitionEnd={swipe.onTransitionEnd}
        >
          <LightboxPhotoPane
            item={props.prevItem}
            eager={false}
            load={loadNeighbors}
          />
          <LightboxPhotoPane
            item={props.item}
            eager={true}
            load={loadNeighbors}
            viewTransitionName={`photo-${props.item.slug}`}
          />
          <LightboxPhotoPane
            item={props.nextItem}
            eager={false}
            load={loadNeighbors}
          />
        </div>
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
            year={props.item.yearKey}
            eventSlug={props.eventSlug}
            eventLabel={props.eventLabel}
            caption={props.item.caption}
            location={props.eventLocation}
          />
        </div>

        <div class="compact-wide:row-start-4">
          <LightboxPagination
            album={props.album}
            prevSlug={props.prevSlug}
            nextSlug={props.nextSlug}
            index={props.index}
            total={props.total}
            onPrev={pagePrev}
            onNext={pageNext}
          />
        </div>
      </div>
    </div>
  )
}
