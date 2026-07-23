import { createSignal } from 'solid-js'

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
 * Dragging toward a side with nowhere to go is damped (`EDGE_RESISTANCE`)
 * rather than ignored outright, so the gesture still feels alive without
 * ever being able to commit.
 */
export function useSwipeNavigation(options: SwipeNavigationOptions) {
  const [offset, setOffset] = createSignal(0)
  const [isDragging, setIsDragging] = createSignal(false)

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
    // that hasn't travelled far yet still counts) in the matching direction.
    const wantsPrev =
      options.canGoPrev() &&
      (delta > width * COMMIT_DISTANCE_RATIO ||
        velocity > COMMIT_VELOCITY_PX_MS)
    const wantsNext =
      options.canGoNext() &&
      (delta < -width * COMMIT_DISTANCE_RATIO ||
        velocity < -COMMIT_VELOCITY_PX_MS)

    if (wantsPrev) {
      exitDirection = 'prev'
      setOffset(width)
      return
    }
    if (wantsNext) {
      exitDirection = 'next'
      setOffset(-width)
      return
    }
    setOffset(0)
  }

  const onTransitionEnd = (event: TransitionEvent) => {
    if (event.propertyName !== 'transform') return
    if (exitDirection === 'prev') options.onCommitPrev()
    else if (exitDirection === 'next') options.onCommitNext()
    exitDirection = undefined
  }

  return {
    offset,
    isDragging,
    setContainer,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onTransitionEnd,
  }
}
