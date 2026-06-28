import { RED_INDEX } from './figures'

/**
 * Declarative animation registry for the WRO mark.
 *
 * Two kinds, via a discriminated union:
 * - `class`: a CSS class is toggled on the SVG for `durationMs` (e.g. the
 *   colour-cycling `shuffle`). The CSS lives in styles.css.
 * - `rig`: a JS-driven path morph. The controller tweens progress `t` from 0→1
 *   over `durationMs` and calls `angle()` per figure/arm to derive arm rotation
 *   in degrees, which `poseFigure` applies to the figure outline.
 */

export interface ClassAnimation {
  name: string
  kind: 'class'
  /** CSS class toggled on the root SVG (e.g. `anim-shuffle`). */
  className: string
  durationMs: number
}

export interface RigAnimation {
  name: string
  kind: 'rig'
  durationMs: number
  /**
   * How each figure's matched arm points move (see `Pose` in pathRig):
   * - `rotate`: `amount` is degrees swung about the shoulder.
   * - `liftY`: `amount` is a vertical offset in px (negative = up), weighted so
   *   the hand moves the full amount in a straight line.
   */
  mode: 'rotate' | 'liftY'
  /**
   * Arm amount for a given normalised progress `t` (0→1), figure index, arm
   * index (0 = left, 1 = right), and total figure count. Units follow `mode`.
   */
  amount: (t: number, figureIndex: number, armIndex: number, figureCount: number) => number
}

export type LogoAnimation = ClassAnimation | RigAnimation

const TWO_PI = Math.PI * 2

/** shuffle — each figure flicks through the palette then settles (CSS). */
const shuffle: ClassAnimation = {
  name: 'shuffle',
  kind: 'class',
  className: 'anim-shuffle',
  durationMs: 900,
}

/**
 * wave — the lone red figure gives a greeting rock: her raised arm swings back
 * and forth a few times around its rest angle. Every other figure stays still.
 */
const wave: RigAnimation = {
  name: 'wave',
  kind: 'rig',
  durationMs: 950,
  mode: 'rotate',
  amount: (t, figureIndex) => {
    if (figureIndex !== RED_INDEX) return 0
    // Three damped rocks; envelope eases the motion in and out.
    const envelope = Math.sin(Math.PI * t)
    return Math.sin(t * TWO_PI * 3) * 20 * envelope
  },
}

/** Peak height (px) the joined hands rise during the chain wave. */
const CHAINWAVE_LIFT = 25

/**
 * chainwave — a stadium-wave ripple of joined hands across the seven chain
 * figures. The hands form columns from left to right: each pair of neighbours
 * shares a column (a figure's right arm and the next figure's left arm hold the
 * same hands), plus the two free ends — eight columns in all. The crest sweeps
 * column-by-column, lifting each column's hands straight up and back down, so a
 * figure's left hand rises a beat before its right and joined hands always move
 * together (they share a column → identical lift). The lone red girl sits this
 * one out.
 */
const chainwave: RigAnimation = {
  name: 'chainwave',
  kind: 'rig',
  durationMs: 1050,
  mode: 'liftY',
  amount: (t, figureIndex, armIndex, figureCount) => {
    if (figureIndex === RED_INDEX) return 0

    const chainCount = figureCount - 1
    // Hand column shared with a neighbour: a figure's left arm (0) is column
    // `figureIndex`, its right arm (1) is `figureIndex + 1` — the next figure's
    // left arm lands on that same column. Columns run 0 … chainCount.
    const column = figureIndex + armIndex
    const phase = column / chainCount

    // The crest sweeps across the columns over the first ~78% of the timeline;
    // each column lifts only while the crest passes it, giving a moving bump.
    const travel = 0.78
    const local = (t - phase * travel) / (1 - travel)
    if (local <= 0 || local >= 1) return 0

    // Negative = up. Both arms of a figure lift together (straight up).
    return -Math.sin(Math.PI * local) * CHAINWAVE_LIFT
  },
}

/** The animation pool hover/focus randomly picks from. */
export const ANIMATION_POOL: ReadonlyArray<LogoAnimation> = [shuffle, wave, chainwave]
