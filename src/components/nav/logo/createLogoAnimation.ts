import { createSignal, onCleanup } from 'solid-js'
import type { LogoAnimation } from './animations'

export interface LogoAnimationController {
  /** CSS class to apply to the root SVG while a `class` animation runs. */
  activeClass: () => string | null
  /** How the current rig animation moves arms; `rotate` when idle/class-kind. */
  armMode: () => 'rotate' | 'liftY'
  /** Per-arm amount for a figure (units follow `armMode`); `[0, 0]` at rest. */
  armAmounts: (figureIndex: number) => Array<number>
  /** Play a named animation, or a random non-repeating one when omitted. */
  play: (name?: string) => void
  /** Stop any running animation and return to rest. */
  stop: () => void
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Solid primitive driving the logo's animation pool. `class` animations toggle
 * a CSS class for their duration; `rig` animations tween progress `t` (0→1)
 * with `requestAnimationFrame` and expose per-arm angles. Random picks never
 * repeat the previous animation, and all motion is gated by
 * `prefers-reduced-motion`. Timers/frames are cleaned up on unmount.
 */
export function createLogoAnimation(
  pool: ReadonlyArray<LogoAnimation>,
  figureCount: number,
): LogoAnimationController {
  const [current, setCurrent] = createSignal<LogoAnimation | null>(null)
  const [progress, setProgress] = createSignal(0)

  let lastName: string | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let frame: number | undefined

  const reset = () => {
    if (timer !== undefined) clearTimeout(timer)
    if (frame !== undefined) cancelAnimationFrame(frame)
    timer = undefined
    frame = undefined
  }

  const stop = () => {
    reset()
    setCurrent(null)
    setProgress(0)
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

  const activeClass = () => {
    const anim = current()
    return anim !== null && anim.kind === 'class' ? anim.className : null
  }

  const armMode = (): 'rotate' | 'liftY' => {
    const anim = current()
    return anim !== null && anim.kind === 'rig' ? anim.mode : 'rotate'
  }

  const armAmounts = (figureIndex: number): Array<number> => {
    const anim = current()
    if (anim === null || anim.kind !== 'rig') return [0, 0]
    const t = progress()
    return [
      anim.amount(t, figureIndex, 0, figureCount),
      anim.amount(t, figureIndex, 1, figureCount),
    ]
  }

  onCleanup(reset)

  return { activeClass, armMode, armAmounts, play, stop }
}
