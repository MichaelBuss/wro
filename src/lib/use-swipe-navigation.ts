import { createEffect, createSignal, on } from 'solid-js'

const COMMIT_DISTANCE_RATIO = 0.22
const COMMIT_VELOCITY_PX_MS = 0.5
const EDGE_RESISTANCE = 0.35

export interface SwipeNavigationOptions {
  /** Whether a rightward drag ("prev") has somewhere to land. */
  canGoPrev: () => boolean
  /** Whether a leftward drag ("next") has somewhere to land. */
  canGoNext: () => boolean
  onCommitPrev: () => void
  onCommitNext: () => void
  /**
   * A key that changes whenever the routed photo does (e.g. its slug). The
   * track is snapped back to centre in lock-step with this changing — see the
   * effect at the bottom of the hook — so committing never re-centres against
   * stale content.
   */
  currentKey: () => string
}

/**
 * Drives a "photo follows your finger" swipe via raw Pointer Events (unified
 * mouse/touch/pen) rather than a snap-scroll container — the lightbox pages
 * through *routes*, not pre-rendered slides sitting in the DOM together, so
 * there's nothing to scroll between.
 *
 * `offset` tracks the pointer 1:1 while dragging (bind it to a `translateX`
 * on the element you want to feel dragged). On release it either springs
 * back to 0 (undecided/cancelled swipes) or finishes sliding fully off in
 * the committed direction — that exit is a CSS transition owned by the
 * consumer (disabled via `isDragging` while actively tracking the pointer),
 * and its end fires the matching `onCommit*` via `onTransitionEnd`, which
 * must be wired to that same element's `ontransitionend`.
 *
 * `commitPrev`/`commitNext` run that same glide-then-navigate without a
 * pointer, so buttons and arrow keys page with the exact animation a drag
 * does rather than a separate one.
 *
 * Dragging toward a side with nowhere to go is damped (`EDGE_RESISTANCE`)
 * rather than ignored outright, so the gesture still feels alive without
 * ever being able to commit.
 */
export function useSwipeNavigation(options: SwipeNavigationOptions) {
  const [offset, setOffset] = createSignal(0)
  const [isDragging, setIsDragging] = createSignal(false)
  // Set for the one frame in which the track snaps back to centre after a
  // committed page turn: the route only swaps `$slug` (the lightbox never
  // remounts), so once the new photo has slid into the centre pane we have to
  // re-centre `offset` ourselves — but *without* animating, or the track
  // would visibly slide back a full pane. Bind it alongside `isDragging` when
  // deciding whether the track transitions.
  const [snapping, setSnapping] = createSignal(false)

  let container: HTMLElement | undefined
  let pointerId: number | undefined
  let startX = 0
  let lastX = 0
  let lastTime = 0
  let velocity = 0
  let exitDirection: 'prev' | 'next' | undefined

  const setContainer = (el: HTMLElement) => {
    container = el
  }

  // How far the track travels to swap one slide for the next: the pane's own
  // width *plus* the gap between panes. Measured off the panes directly (the
  // distance between the first two) rather than the container's width, so a
  // committed slide lands exactly where the next route's freshly-centred pane
  // will sit — using the container width instead leaves it a gap short, and
  // the pane visibly snaps back that gap the moment navigation remounts it.
  const slideStride = (): number => {
    const track = container?.firstElementChild
    const first = track?.children[0]
    const second = track?.children[1]
    if (first instanceof HTMLElement && second instanceof HTMLElement) {
      return second.offsetLeft - first.offsetLeft
    }
    return container?.clientWidth ?? window.innerWidth
  }

  // Kick off navigation to the committed neighbour, leaving the track parked
  // at ±stride (the neighbour pane sitting dead-centre) so it keeps showing
  // the photo we slid to. `offset` is *not* reset here: navigation is async
  // (a server-fn loader), and re-centring now — while the panes still hold
  // the old prev/current/next — would yank the photo we just landed on off to
  // the side for those in-between frames. The re-centre instead happens in
  // lock-step with `currentKey` changing (effect at the bottom), so the new
  // photo swaps into the centre pane and `offset` returns to 0 in the same
  // frame, staying pinned in place. Called from the glide's `transitionend`,
  // or directly when no glide runs (see `startExit`).
  const finishExit = () => {
    const direction = exitDirection
    if (direction === undefined) return
    exitDirection = undefined
    if (direction === 'prev') options.onCommitPrev()
    else options.onCommitNext()
  }

  // Glide fully to the neighbouring pane in `direction`; the transition end
  // (below) is what actually navigates. Guarded so nothing re-triggers it
  // mid-flight — a key repeat, a button tap during the glide, or a fresh
  // drag while a committed one is still animating off.
  const startExit = (direction: 'prev' | 'next') => {
    if (exitDirection !== undefined || pointerId !== undefined) return
    exitDirection = direction
    const stride = slideStride()
    const target = direction === 'prev' ? stride : -stride
    // A drag released exactly at the target offset wouldn't change `offset`,
    // so no `transform` transition — and thus no `transitionend` — would ever
    // fire. Commit straight away in that case, or the lightbox would wedge
    // (with `exitDirection` set, every later gesture is ignored too).
    if (offset() === target) {
      finishExit()
      return
    }
    setOffset(target)
  }

  const onPointerDown = (event: PointerEvent) => {
    // Ignore new gestures while a committed swipe is still animating off,
    // and right/middle mouse "drags", which aren't swipes.
    if (exitDirection || (event.pointerType === 'mouse' && event.button !== 0))
      return

    pointerId = event.pointerId
    startX = event.clientX
    lastX = event.clientX
    lastTime = event.timeStamp
    velocity = 0
    container?.setPointerCapture(event.pointerId)
    setIsDragging(true)
  }

  const onPointerMove = (event: PointerEvent) => {
    if (pointerId === undefined || event.pointerId !== pointerId) return

    const rawDelta = event.clientX - startX
    const canFollow = rawDelta > 0 ? options.canGoPrev() : options.canGoNext()
    setOffset(canFollow ? rawDelta : rawDelta * EDGE_RESISTANCE)

    const elapsed = event.timeStamp - lastTime
    if (elapsed > 0) velocity = (event.clientX - lastX) / elapsed
    lastX = event.clientX
    lastTime = event.timeStamp
  }

  const onPointerUp = (event: PointerEvent) => {
    if (pointerId === undefined || event.pointerId !== pointerId) return
    container?.releasePointerCapture(event.pointerId)
    pointerId = undefined
    setIsDragging(false)

    const width = container?.clientWidth ?? window.innerWidth
    const delta = offset()
    // A commit needs either enough distance or enough speed (a quick flick
    // that hasn't travelled far yet still counts) — but always in the same
    // direction the track was actually dragged. Gating the velocity path on
    // `delta`'s sign stops a last-moment flick back the other way (positive
    // velocity at the end of a leftward drag, say) from committing the
    // opposite way to the one the photo visibly moved.
    const wantsPrev =
      options.canGoPrev() &&
      delta > 0 &&
      (delta > width * COMMIT_DISTANCE_RATIO ||
        velocity > COMMIT_VELOCITY_PX_MS)
    const wantsNext =
      options.canGoNext() &&
      delta < 0 &&
      (delta < -width * COMMIT_DISTANCE_RATIO ||
        velocity < -COMMIT_VELOCITY_PX_MS)

    if (wantsPrev) {
      startExit('prev')
      return
    }
    if (wantsNext) {
      startExit('next')
      return
    }
    setOffset(0)
  }

  // The keyboard/button entry points into the same commit path a released
  // swipe takes — no-ops at the ends of the album (nothing to land on).
  const commitPrev = () => {
    if (options.canGoPrev()) startExit('prev')
  }
  const commitNext = () => {
    if (options.canGoNext()) startExit('next')
  }

  // Fires for the committed glide (→ navigate) as well as for a cancelled
  // swipe springing back to 0; `finishExit` no-ops in the latter since
  // `exitDirection` is unset.
  const onTransitionEnd = (event: TransitionEvent) => {
    if (event.propertyName !== 'transform') return
    finishExit()
  }

  // The committed glide parks the track at ±stride with the neighbour pane
  // centred; navigation then swaps that neighbour into the *centre* pane.
  // Snap `offset` back to 0 the moment that swap lands (this key changing is
  // the signal it has) so the photo stays put — same pane content, same
  // screen position — instead of jumping. `defer` skips the initial run, and
  // transitions are suppressed for the snap so it doesn't slide; re-enabled a
  // frame later, by when `offset` is unchanged so nothing animates.
  createEffect(
    on(
      options.currentKey,
      () => {
        setSnapping(true)
        setOffset(0)
        requestAnimationFrame(() => setSnapping(false))
      },
      { defer: true },
    ),
  )

  return {
    offset,
    isDragging,
    snapping,
    setContainer,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onTransitionEnd,
    commitPrev,
    commitNext,
  }
}
