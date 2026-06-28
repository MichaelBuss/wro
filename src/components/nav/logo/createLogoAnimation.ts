import { createSignal, onCleanup } from 'solid-js'
import type { LogoAnimation } from './animations'
import { DEFAULT_INTERACTIVE, interactiveAmounts, interactiveMode } from './interactive'
import type { Field, InteractiveConfig } from './interactive'

export interface LogoAnimationController {
  /** CSS class to apply to the root SVG while a `class` animation runs. */
  activeClass: () => string | null
  /** How a figure's arms move right now: `rotate` (deg) or `liftY` (px). */
  armMode: (figureIndex: number) => 'rotate' | 'liftY'
  /** Per-arm amount for a figure (units follow `armMode`); `[0, 0]` at rest. */
  armAmounts: (figureIndex: number) => Array<number>
  /** Play a named clip ("movie"), or a random non-repeating one when omitted. */
  play: (name?: string) => void
  /** Stop any clip/interaction and return to rest. */
  stop: () => void
  /** Cursor entered the mark at normalised x (0→1); begin following. */
  pointerEnter: (x: number) => void
  /** Cursor moved to normalised x (0→1) while over the mark. */
  pointerMove: (x: number) => void
  /** Cursor left the mark; ease the interaction back to rest. */
  pointerLeave: () => void
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Solid primitive driving the logo. Two regimes share one controller:
 *
 * - **Clips ("movies")** — `class` animations toggle a CSS class for their
 *   duration; `rig` animations tween progress `t` (0→1) via rAF. Random picks
 *   never repeat the previous clip. Triggered on load/refocus, never on hover.
 * - **Interactive ("follow the mouse")** — a spring rAF eases a normalised
 *   cursor field `{ x, influence, velocity, time }`, which `interactive.ts`
 *   turns into the crest hand-lift, the red girl's tracking wave, and the
 *   sticky colour chase. Hovering supersedes any clip; leaving eases to rest.
 *
 * All motion is gated by `prefers-reduced-motion`, and every timer/frame is
 * cleaned up on unmount. `getConfig` is read each frame so the feel can be
 * tuned live.
 */
export function createLogoAnimation(
  pool: ReadonlyArray<LogoAnimation>,
  figureCount: number,
  getConfig: () => InteractiveConfig = () => DEFAULT_INTERACTIVE,
): LogoAnimationController {
  const [current, setCurrent] = createSignal<LogoAnimation | null>(null)
  const [progress, setProgress] = createSignal(0)

  const [fieldX, setFieldX] = createSignal(0.5)
  const [influence, setInfluence] = createSignal(0)
  const [clock, setClock] = createSignal(0)
  const [interacting, setInteracting] = createSignal(false)

  let lastName: string | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let frame: number | undefined

  // Interactive state (plain — only the eased signals above need reactivity).
  let pointerInside = false
  let targetX = 0.5
  let springFrame: number | undefined
  let springStart = 0

  const reset = () => {
    if (timer !== undefined) clearTimeout(timer)
    if (frame !== undefined) cancelAnimationFrame(frame)
    timer = undefined
    frame = undefined
  }

  const field = (): Field => ({
    x: fieldX(),
    influence: influence(),
    time: clock(),
  })

  /* — interactive (pointer follow) — */

  const spring = (now: number) => {
    const cfg = getConfig()
    setClock((now - springStart) / 1000)

    const presence = pointerInside ? 1 : 0
    const rate = pointerInside ? cfg.influenceIn : cfg.influenceOut
    setInfluence(influence() + (presence - influence()) * rate)

    setFieldX(fieldX() + (targetX - fieldX()) * cfg.springLag)

    if (!pointerInside && influence() < 0.002) {
      setInfluence(0)
      setInteracting(false)
      springFrame = undefined
      return
    }
    springFrame = requestAnimationFrame(spring)
  }

  const startSpring = () => {
    if (springFrame !== undefined) return
    springStart = performance.now()
    springFrame = requestAnimationFrame(spring)
  }

  const pointerEnter = (x: number) => {
    if (prefersReducedMotion()) return
    reset()
    setCurrent(null)
    setProgress(0)
    targetX = x
    if (!interacting()) {
      setFieldX(x)
      setInfluence(0)
      setInteracting(true)
    }
    pointerInside = true
    startSpring()
  }

  const pointerMove = (x: number) => {
    if (prefersReducedMotion()) return
    if (!interacting()) {
      pointerEnter(x)
      return
    }
    targetX = x
    pointerInside = true
  }

  const pointerLeave = () => {
    pointerInside = false
  }

  /* — clips ("movies") — */

  const stop = () => {
    reset()
    setCurrent(null)
    setProgress(0)
    pointerInside = false
    if (springFrame !== undefined) cancelAnimationFrame(springFrame)
    springFrame = undefined
    setInteracting(false)
    setInfluence(0)
  }

  const pick = (name?: string): LogoAnimation | null => {
    if (name !== undefined) return pool.find((anim) => anim.name === name) ?? null
    const candidates = pool.filter((anim) => anim.name !== lastName)
    const choices = candidates.length > 0 ? candidates : pool
    if (choices.length === 0) return null
    return choices[Math.floor(Math.random() * choices.length)]
  }

  const runRig = (anim: LogoAnimation) => {
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / anim.durationMs)
      setProgress(t)
      if (t < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        stop()
      }
    }
    frame = requestAnimationFrame(tick)
  }

  const play = (name?: string) => {
    if (interacting() || pointerInside) return
    if (current() !== null) return
    if (prefersReducedMotion()) return

    const anim = pick(name)
    if (anim === null) return

    lastName = anim.name
    setProgress(0)
    setCurrent(anim)

    if (anim.kind === 'class') {
      timer = setTimeout(stop, anim.durationMs)
    } else {
      runRig(anim)
    }
  }

  /* — render-time getters — */

  const activeClass = () => {
    const anim = current()
    return anim !== null && anim.kind === 'class' ? anim.className : null
  }

  const armMode = (figureIndex: number): 'rotate' | 'liftY' => {
    if (interacting()) return interactiveMode(figureIndex)
    const anim = current()
    return anim !== null && anim.kind === 'rig' ? anim.mode : 'rotate'
  }

  const armAmounts = (figureIndex: number): Array<number> => {
    if (interacting()) return interactiveAmounts(getConfig(), field(), figureIndex)
    const anim = current()
    if (anim === null || anim.kind !== 'rig') return [0, 0]
    const t = progress()
    return [
      anim.amount(t, figureIndex, 0, figureCount),
      anim.amount(t, figureIndex, 1, figureCount),
    ]
  }

  onCleanup(() => {
    reset()
    if (springFrame !== undefined) cancelAnimationFrame(springFrame)
  })

  return {
    activeClass,
    armMode,
    armAmounts,
    play,
    stop,
    pointerEnter,
    pointerMove,
    pointerLeave,
  }
}
