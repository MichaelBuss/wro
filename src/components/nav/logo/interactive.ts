import { FIGURES, RED_INDEX } from './figures'

/**
 * Pointer-driven ("follow the mouse") behaviour for the WRO mark.
 *
 * Where the `class`/`rig` animations in `animations.ts` are timeline clips
 * (a clock `t` runs 0→1), this module describes a *continuous* regime: the
 * input is the cursor, not a clock. The controller eases a normalised cursor
 * field — `{ x, influence }`, both 0→1 — and these pure functions turn that
 * field into per-figure arm motion.
 *
 * Hover is deliberately motion-only: the chain's wave crest follows the cursor
 * and the lone red girl waves toward it. Colour stays with the movies (the
 * `shuffle` clip on load/refocus), so the two never play at once. Everything is
 * parameterised by `InteractiveConfig` so the feel can be tuned live (see the
 * `/logo-play` harness) before the numbers are baked in.
 */

export const VIEWBOX_W = 1152

/** Eased, normalised cursor state the controller feeds to the math below. */
export interface Field {
  /** Cursor x across the mark, 0 (left) → 1 (right), spring-eased. */
  x: number
  /** How "present" the cursor is, 0 (gone) → 1 (settled in), eased. */
  influence: number
  /** Seconds since the interaction started, for idle motion (red girl bob). */
  time: number
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

  /* — lone red girl (waves only when the cursor nears her right side) — */
  /** Peak swing of her wave, in degrees. */
  trackDeg: number
  /** Amplitude of her wave oscillation, in degrees. */
  bobDeg: number
  /**
   * How far to her right (normalised x) her wave peaks. She stays at rest until
   * the cursor passes her centre, ramps to full just off her right shoulder,
   * then fades toward the edge — so she only greets cursors on her hand side.
   */
  redRange: number
}

export const DEFAULT_INTERACTIVE: InteractiveConfig = {
  liftPx: 26,
  bumpWidth: 0.07,
  springLag: 0.18,
  influenceIn: 0.12,
  influenceOut: 0.08,
  trackDeg: 24,
  bobDeg: 3,
  redRange: 0.04,
}

const CHAIN_COUNT = RED_INDEX // figures 0 … RED_INDEX-1 form the hand chain
const CHAIN = FIGURES.slice(0, CHAIN_COUNT)

/** Normalised x of the lone red girl's centre (her shoulder pivot). */
const RED_CENTER_X = FIGURES[RED_INDEX].arms[0].pivot[0] / VIEWBOX_W

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
function columnLift(cfg: InteractiveConfig, field: Field, column: number): number {
  const d = (COLUMN_X[column] - field.x) / cfg.bumpWidth
  return -cfg.liftPx * field.influence * gaussian(d)
}

/**
 * Per-arm amount for a figure under the cursor field. Chain figures lift their
 * two hand columns (`liftY`); the red girl waves her arm (`rotate`) only while
 * the cursor is past her centre, on her right (hand) side — the envelope ramps
 * from her centre, peaks just off her shoulder, then fades toward the edge.
 */
export function interactiveAmounts(
  cfg: InteractiveConfig,
  field: Field,
  figureIndex: number,
): [number, number] {
  if (figureIndex === RED_INDEX) {
    const d = field.x - RED_CENTER_X
    if (d <= 0) return [0, 0] // cursor on her left → fully at rest
    const u = d / cfg.redRange
    const prox = u * Math.exp(1 - u) // 0 at her centre, peaks 1 at u = 1
    const swing = cfg.trackDeg * prox * field.influence
    const bob = Math.sin(field.time * 1.6) * cfg.bobDeg * prox * field.influence
    return [swing + bob, 0]
  }
  return [columnLift(cfg, field, figureIndex), columnLift(cfg, field, figureIndex + 1)]
}

/** Which arm-driving mode a figure uses while the cursor is steering it. */
export function interactiveMode(figureIndex: number): 'rotate' | 'liftY' {
  return figureIndex === RED_INDEX ? 'rotate' : 'liftY'
}
