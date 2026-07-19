import { Link, useNavigate, useRouter } from '@tanstack/solid-router'
import { ChevronLeft, ChevronRight, Info, X } from 'lucide-solid'
import { Show, createSignal, onCleanup, onMount } from 'solid-js'
import type { GalleryItem } from '~/components/ui'
import { cx } from '~/cva.config'
import type { WindowControlSide } from '~/lib/platform'
import { windowControlSide } from '~/lib/platform'
import { galleryTransitionTypes } from '~/lib/view-transitions'

// Module-level, not component-local: the route re-mounts `PhotoLightbox` on
// every prev/next page turn (new `$slug`, fresh component instance), which
// would otherwise reset this back to hidden on every single photo. Living
// here instead lets it survive that and behave as one continuous session
// preference while browsing. Safe across SSR — it's only ever mutated from
// a click handler, which never runs during server rendering.
const [infoVisible, setInfoVisible] = createSignal(false)

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

interface PaginationControlsProps {
  year: string
  prevSlug: string | undefined
  nextSlug: string | undefined
  index: number
  total: number
}

function CompactCloseButton(props: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => props.onClick()}
      aria-label="Luk"
      class="rounded-full p-1.5 text-white/60 transition-colors hover:text-white"
    >
      <X size={18} />
    </button>
  )
}

interface InfoToggleButtonProps {
  visible: boolean
  onToggle: () => void
}

/** Fakes a "filled" active state — lucide only ships outline icons, so an
 * inverted pill (solid background, contrasting icon) stands in for one. */
function InfoToggleButton(props: InfoToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={() => props.onToggle()}
      aria-label={props.visible ? 'Skjul billedinfo' : 'Vis billedinfo'}
      aria-pressed={props.visible}
      class={cx(
        'rounded-full p-1.5 transition-colors',
        props.visible
          ? 'bg-white text-black'
          : 'text-white/60 hover:text-white',
      )}
    >
      <Info size={18} />
    </button>
  )
}

/**
 * The "‹ 3 af 9 ›" pagination row — shared between the normal stacked
 * caption block and the compact short-viewport bar below, so both stay in
 * sync instead of drifting into two copies of the same markup.
 */
function PaginationControls(props: PaginationControlsProps) {
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
      class="fixed inset-0 z-50 flex flex-col bg-black/95 outline-none"
    >
      {/* Only for the normal (height-abundant) layout below — short
          viewports put an equivalent close button inside the compact bar
          instead, since this one has nowhere reserved to float there. */}
      <button
        type="button"
        onClick={close}
        aria-label="Luk"
        class={cx(
          'absolute top-4 z-20 rounded-full bg-black/40 p-2.5 text-white/80 ring-1 ring-white/10 backdrop-blur-sm transition-colors short:hidden hover:bg-black/60 hover:text-white hover:ring-white/20',
          controlSide() === 'left' ? 'left-4' : 'right-4',
        )}
      >
        <X size={22} />
      </button>

      {/* A CSS grid with every overlay sharing the same cell — stacking them
          is just DOM order, no `absolute`/z-index needed. Top padding
          reserves a gutter the image itself can never grow into (so it
          can't end up flush against the close button above), dropped on
          short viewports where that space is too precious to spare. */}
      <div class="grid min-h-0 flex-1 grid-cols-1 grid-rows-1 place-items-center overflow-hidden px-4 pt-16 short:pt-2 sm:pt-20">
        <img
          src={props.item.src}
          srcset={props.item.srcset}
          sizes={props.item.sizes}
          alt={props.item.alt}
          class="col-start-1 row-start-1 max-h-full max-w-full object-contain"
          style={{ 'view-transition-name': `photo-${props.item.slug}` }}
        />

        {/* Compact chrome for short (landscape-phone) viewports only: a slim
            bar directly on the image instead of the stacked block below,
            which would otherwise eat most of the little height available.
            Close and the info toggle sit on opposite ends, in whichever
            order matches the platform's window-control convention. */}
        <div class="col-start-1 row-start-1 hidden w-full items-center justify-between gap-3 self-end bg-black/40 px-3 py-1.5 backdrop-blur-sm short:flex">
          <Show
            when={controlSide() === 'left'}
            fallback={
              <InfoToggleButton
                visible={infoVisible()}
                onToggle={() => setInfoVisible((visible) => !visible)}
              />
            }
          >
            <CompactCloseButton onClick={close} />
          </Show>

          <PaginationControls
            year={props.year}
            prevSlug={props.prevSlug}
            nextSlug={props.nextSlug}
            index={props.index}
            total={props.total}
          />

          <Show
            when={controlSide() === 'left'}
            fallback={<CompactCloseButton onClick={close} />}
          >
            <InfoToggleButton
              visible={infoVisible()}
              onToggle={() => setInfoVisible((visible) => !visible)}
            />
          </Show>
        </div>

        <Show when={infoVisible()}>
          <div class="col-start-1 row-start-1 mb-11 hidden max-w-[min(80vw,22rem)] flex-col items-center gap-1 self-end rounded-2xl bg-black/50 px-4 py-2 text-center text-white/90 ring-1 ring-white/10 backdrop-blur-sm short:flex">
            <Show when={props.item.caption ?? props.eventLabel}>
              <p class="font-serif italic text-sm-copy">
                {props.item.caption ?? props.eventLabel}
              </p>
            </Show>
            <Show when={props.eventLocation}>
              {(location) => (
                <p class="text-caption text-white/50">{location()}</p>
              )}
            </Show>
          </div>
        </Show>
      </div>

      {/* Normal (height-abundant) chrome: a flex sibling below the image,
          not an absolute overlay, so a tall photo shrinks to make room
          instead of running underneath this. Hidden on short viewports,
          which use the compact grid-stacked chrome above instead. */}
      <div class="lightbox-caption flex shrink-0 flex-col items-center gap-2 px-6 py-6 text-center text-white/90 short:hidden">
        <Show when={props.item.caption ?? props.eventLabel}>
          <p class="font-serif italic text-sm-copy">
            {props.item.caption ?? props.eventLabel}
          </p>
        </Show>
        <Show when={props.eventLocation}>
          {(location) => <p class="text-caption text-white/50">{location()}</p>}
        </Show>

        <PaginationControls
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
