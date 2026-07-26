import { Show, createEffect, createSignal } from 'solid-js'
import type { Accessor } from 'solid-js'
import type { GalleryItem } from '~/components/ui'
import { cx } from '~/cva.config'

interface LightboxPhotoPaneProps {
  /** `undefined` at either end of an event group — no neighbour to show. */
  item: GalleryItem | undefined
  /**
   * Fetch immediately, rather than waiting on `load()` — for the
   * currently-viewed photo, which the route itself already needs. A
   * neighbour instead stays as just its colour placeholder until `load()`
   * flips true (idle time after mount, or the swipe gesture starting), so a
   * visit that never swipes never fetches photos beyond the one on screen.
   */
  eager: boolean
  load: Accessor<boolean>
  /** Only ever set for the current photo — see photo-lightbox.tsx. */
  viewTransitionName?: string
}

/**
 * One slide of the lightbox's swipe track: a colour placeholder sized to
 * the photo's real aspect ratio (known up front from frontmatter, so it's
 * never a size guess) that the actual photo cross-fades over once it has
 * loaded. Used for all three slides (prev/current/next) — only `eager` and
 * `load` differ between the one you're looking at and its neighbours.
 */
export function LightboxPhotoPane(props: LightboxPhotoPaneProps) {
  const [loaded, setLoaded] = createSignal(false)
  const shouldFetch = () => props.eager || props.load()
  let imgRef: HTMLImageElement | undefined

  // The eager (current) photo's `src` is set from the very first render —
  // SSR'd, or already browser-cached — so the `load` event has often
  // already fired by the time `onLoad` below gets attached. Re-check on
  // every `shouldFetch()` flip (mount, for eager; whenever a neighbour
  // starts fetching) to catch that already-complete case too.
  createEffect(() => {
    if (shouldFetch() && imgRef?.complete) setLoaded(true)
  })

  return (
    // A single explicit `1fr` track stacks the colour placeholder and the
    // photo in the same cell, `place-items-center` centring each so it can
    // size itself independently (rather than stretching to fill) — capped
    // to the pane by `max-h-full max-w-full`, the shrink-to-fit `rounded-lg`
    // box the photo lived in pre-swipe-track, now with two layers.
    //
    // Getting that box to *actually* fit — the same size as the visible
    // photo, so `rounded-lg` rounds its real corners rather than a bigger
    // letterboxed rectangle around it — takes two things on each layer:
    //
    //   1. `min-h-0 min-w-0` — a `1fr` track's per-item "automatic minimum
    //      size" (the grid twin of flexbox's min-width/height:auto pitfall)
    //      defaults to the item's max-content, i.e. the photo's *natural*
    //      size, which would let the item inflate the track past the space
    //      available and hand `max-h-full`'s `100%` that inflated height to
    //      resolve against. Zeroing it sizes the track from the pane alone.
    //   2. `h-auto w-auto` — a bare `<img width height>` maps those
    //      attributes to *CSS* width/height (presentation hints), making
    //      both axes definite so `max-w`/`max-h` clamp them independently
    //      and squash the box out of aspect ratio (the photo then only
    //      looked contained thanks to `object-contain` painting inside that
    //      squashed box, corners and all). `auto` hands sizing back to the
    //      intrinsic ratio so the box tracks the photo. The placeholder is
    //      an <svg> for the same reason: a plain <div> can't be sized by an
    //      aspect ratio inside a centred (non-stretch) grid cell — its
    //      percentage heights resolve against a content-sized track and
    //      collapse to 0 — but an SVG is a replaced element sized from its
    //      width/height attributes exactly like the <img>, so the two
    //      layers stay pixel-identical across every viewport and aspect.
    <div class="grid h-full w-full flex-none grid-cols-[1fr] grid-rows-[1fr] place-items-center">
      <Show when={props.item}>
        {(item) => (
          <>
            <svg
              aria-hidden="true"
              width={item().width}
              height={item().height}
              class="col-start-1 row-start-1 h-auto max-h-full w-auto min-h-0 max-w-full min-w-0 rounded-lg"
              style={{ 'background-color': item().color }}
            />
            <img
              ref={imgRef}
              src={shouldFetch() ? item().src : undefined}
              srcset={shouldFetch() ? item().srcset : undefined}
              sizes={item().sizes}
              width={item().width}
              height={item().height}
              alt={item().alt}
              draggable={false}
              onLoad={() => setLoaded(true)}
              class={cx(
                'col-start-1 row-start-1 h-auto max-h-full w-auto min-h-0 max-w-full min-w-0 rounded-lg object-contain',
                // The fade-in is for neighbours, which can genuinely take a
                // moment to fetch after mount — the current photo is what
                // the route itself waited on, so by the time this pane
                // exists it's normally already loaded (or a beat away),
                // and animating its opacity just reads as a flash of
                // missing content on every page turn.
                !props.eager && 'transition-opacity duration-300',
                !props.eager && (loaded() ? 'opacity-100' : 'opacity-0'),
              )}
              style={
                props.viewTransitionName === undefined
                  ? undefined
                  : { 'view-transition-name': props.viewTransitionName }
              }
            />
          </>
        )}
      </Show>
    </div>
  )
}
