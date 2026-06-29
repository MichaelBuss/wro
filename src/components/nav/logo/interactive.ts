import { FIGURES, RED_INDEX } from './figures'
import { parsePath } from './pathRig'

/**
 * Pointer-driven ("follow the mouse") behaviour for the WRO mark.
 *
 * Where the `class`/`rig` animations in `animations.ts` are timeline clips
 * (a clock `t` runs 0→1), this module describes a *continuous* regime: the
 * input is the cursor, not a clock. The controller eases a normalised cursor
 * field — `{ x, y, influence }` — and these pure functions turn that field into
 * per-figure arm motion.
 *
 * Hover is deliberately motion-only: the chain's wave crest follows the cursor
 * and the lone red girl's arm points at it. Colour stays with the movies (the
 * `shuffle` clip on load/refocus), so the two never play at once. Everything is
 * parameterised by `InteractiveConfig` so the feel can be tuned live (see the
 * `/logo-play` harness) before the numbers are baked in.
 *
 * The red girl's arm is flush with the mark's right edge, so there's no room to
 * greet her from over the SVG. `samplePointer` therefore widens the active field
 * past that edge into a screen-space reach radius: a cursor on her hand side,
 * even just outside the logo, still gets her arm to track it.
 */

/** The mark's `viewBox` ("0 -4 1152 171"); used to map the field to art space. */
export const VIEWBOX_W = 1152
const VIEWBOX_MIN_Y = -4
const VIEWBOX_H = 171

/** Eased, normalised cursor state the controller feeds to the math below. */
export interface Field {
  /** Cursor x across the mark, 0 (left) → 1 (right), spring-eased; >1 = past her. */
  x: number
  /** Cursor y across the mark, 0 (top) → 1 (bottom), spring-eased. */
  y: number
  /** How "present" the cursor is, 0 (gone) → 1 (settled in), eased. */
  influence: number
}

export interface InteractiveConfig {
  /* — crest (chain hand-lift bump that rides under the cursor) — */
  /** Peak hand lift in viewBox px (the chainwave clip uses 30). */
  liftPx: number
  /** Bump half-width in normalised x; larger = more figures lift at once. */
  bumpWidth: number
  /** Per-frame ease of rendered x toward the cursor (0–1; lower = laggier). */
  springLag: number
  /** Per-frame ease of influence toward 1 while the cursor is present. */
  influenceIn: number
  /** Per-frame ease of influence toward 0 once the cursor leaves. */
  influenceOut: number

  /* — lone red girl (her arm points at a cursor on her right/hand side) — */
  /**
   * Screen-space radius (px) off the mark's right edge in which she still
   * greets a passing cursor, even when it never touches the logo. Inside it she
   * points fully; the `influenceIn/Out` easing smooths entering and leaving.
   */
  reachPx: number
}

export const DEFAULT_INTERACTIVE: InteractiveConfig = {
  liftPx: 26,
  bumpWidth: 0.07,
  springLag: 0.18,
  influenceIn: 0.12,
  influenceOut: 0.08,
  reachPx: 50,
}

/** Rect-like geometry of the rendered mark, in client (screen) px. */
export interface MarkRect {
  left: number
  top: number
  width: number
  height: number
}

/** Raw cursor turned into the controller's eased-toward targets. */
export interface PointerField {
  /** Unclamped normalised cursor x across the mark (>1 means off her right). */
  x: number
  /** Unclamped normalised cursor y across the mark (<0 above, >1 below). */
  y: number
  /** Target presence 0→1: 1 over the mark, fading across the red girl's reach. */
  presence: number
}

/**
 * Map a raw cursor position to the controller's `{ x, y, presence }` field.
 *
 * Over the mark the cursor has full presence (chain crest and red girl both
 * live). Off the mark's right edge — her hand side — presence stays full out to
 * a `reachPx` radius, so she greets a passing cursor that never quite reaches
 * the tiny logo. Presence is engagement, not strength: it's binary so her arm
 * points *fully* at the cursor anywhere inside the reach, and the controller's
 * `influenceIn/Out` easing handles the smooth swing out and back. Out there
 * `x`/`y` are left unclamped so her arm can aim at the true cursor; the chain
 * crest's gaussian has long since fallen to ~0. Elsewhere off the mark it's 0.
 */
export function samplePointer(
  cfg: InteractiveConfig,
  rect: MarkRect,
  clientX: number,
  clientY: number,
): PointerField {
  if (rect.width === 0 || rect.height === 0)
    return { x: 0.5, y: 0.5, presence: 0 }
  const x = (clientX - rect.left) / rect.width
  const y = (clientY - rect.top) / rect.height
  const right = rect.left + rect.width
  const bottom = rect.top + rect.height
  const inside =
    clientX >= rect.left &&
    clientX <= right &&
    clientY >= rect.top &&
    clientY <= bottom
  if (inside) return { x, y, presence: 1 }

  const dx = clientX - right
  if (dx <= 0) return { x, y, presence: 0 } // only off her right (hand) edge
  const dy =
    clientY < rect.top
      ? rect.top - clientY
      : clientY > bottom
        ? clientY - bottom
        : 0
  const presence = Math.hypot(dx, dy) <= cfg.reachPx ? 1 : 0
  return { x, y, presence }
}

const CHAIN_COUNT = RED_INDEX // figures 0 … RED_INDEX-1 form the hand chain
const CHAIN = FIGURES.slice(0, CHAIN_COUNT)

/** The red girl's shoulder pivot (viewBox px) — the arm rotates about this. */
const RED_PIVOT = FIGURES[RED_INDEX].arms[0].pivot

/**
 * Her arm's rest direction, in radians (SVG space: +x right, +y down). Derived
 * from the art — the arm-region point farthest from the shoulder is her
 * fingertip — so "point at the cursor" is the rotation that swings this axis
 * onto the shoulder→cursor line.
 */
const RED_REST_ANGLE = (() => {
  const joint = FIGURES[RED_INDEX].arms[0]
  const tips = parsePath(FIGURES[RED_INDEX].d)
    .flatMap((cmd) => cmd.pts)
    .filter(joint.contains)
  let tip = tips[0] ?? RED_PIVOT
  let far = -1
  for (const p of tips) {
    const d2 = (p[0] - RED_PIVOT[0]) ** 2 + (p[1] - RED_PIVOT[1]) ** 2
    if (d2 > far) {
      far = d2
      tip = p
    }
  }
  return Math.atan2(tip[1] - RED_PIVOT[1], tip[0] - RED_PIVOT[0])
})()

/** Free-end overhang (px) past the outermost shoulders for the end columns. */
const END_GAP = 18

/**
 * Normalised x of each hand column (0 … CHAIN_COUNT). A figure's right hand and
 * its neighbour's left hand share a column, so driving lift by column x keeps
 * joined hands locked together — same guarantee as the `chainwave` clip.
 */
const COLUMN_X: ReadonlyArray<number> = (() => {
  const left = (i: number) => CHAIN[i].arms[0].pivot[0]
  const right = (i: number) => CHAIN[i].arms[1].pivot[0]
  const xs: Array<number> = []
  for (let c = 0; c <= CHAIN_COUNT; c += 1) {
    if (c === 0) xs.push(left(0) - END_GAP)
    else if (c === CHAIN_COUNT) xs.push(right(CHAIN_COUNT - 1) + END_GAP)
    else xs.push((right(c - 1) + left(c)) / 2)
  }
  return xs.map((x) => x / VIEWBOX_W)
})()

const gaussian = (z: number) => Math.exp(-z * z)

/**
 * Hand lift (px, negative = up) for one column under the eased cursor: a
 * gaussian bump centred on `field.x`, scaled by influence.
 */
function columnLift(
  cfg: InteractiveConfig,
  field: Field,
  column: number,
): number {
  const d = (COLUMN_X[column] - field.x) / cfg.bumpWidth
  return -cfg.liftPx * field.influence * gaussian(d)
}

/** Wrap an angle (radians) to (−π, π], so the arm always takes the short way. */
function wrapPi(rad: number): number {
  return rad - Math.PI * 2 * Math.round(rad / (Math.PI * 2))
}

/**
 * Asymmetric rotation limits for the red girl's arm (degrees from her rest
 * pose). Negative = counterclockwise = upward in SVG space (arm lifts toward
 * the cursor above). Positive = clockwise = downward (arm droops toward the
 * dress). Tune both here before baking.
 */
const MAX_UP_DEG = 62 // how high she can raise her arm toward the cursor
const MAX_DOWN_DEG = 32 // how far it droops before overlapping the dress

/**
 * Per-arm amount for a figure under the cursor field. Chain figures lift their
 * two hand columns (`liftY`); the red girl's arm rotates to *point* at the
 * cursor (`rotate`) whenever it's on her right (hand) side — the angle is the
 * shortest swing from her rest pose onto the shoulder→cursor line, clamped
 * asymmetrically (`MAX_UP_DEG` upward, `MAX_DOWN_DEG` downward so the
 * fingertip never overlaps the dress) and scaled by influence so she eases back
 * to rest as the cursor leaves.
 */
export function interactiveAmounts(
  cfg: InteractiveConfig,
  field: Field,
  figureIndex: number,
): [number, number] {
  if (figureIndex === RED_INDEX) {
    const cx = field.x * VIEWBOX_W
    const cy = VIEWBOX_MIN_Y + field.y * VIEWBOX_H
    const dx = cx - RED_PIVOT[0]
    const dy = cy - RED_PIVOT[1]
    if (dx <= 0) return [0, 0] // cursor on her left → fully at rest

    const aim = (wrapPi(Math.atan2(dy, dx) - RED_REST_ANGLE) * 180) / Math.PI
    const clamped = Math.max(-MAX_UP_DEG, Math.min(MAX_DOWN_DEG, aim))
    return [clamped * field.influence, 0]
  }
  return [
    columnLift(cfg, field, figureIndex),
    columnLift(cfg, field, figureIndex + 1),
  ]
}

/** Which arm-driving mode a figure uses while the cursor is steering it. */
export function interactiveMode(figureIndex: number): 'rotate' | 'liftY' {
  return figureIndex === RED_INDEX ? 'rotate' : 'liftY'
}
