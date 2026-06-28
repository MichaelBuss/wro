/**
 * Tiny SVG path "rig": parse the absolute `M`/`L`/`C` commands potrace emits,
 * rotate selected points about a pivot, and serialise back. This lets a single
 * continuous figure outline be "posed" (e.g. an arm raised) by rotating only
 * the arm-tip points, so the shoulder skin deforms continuously and never gaps
 * the way a rigidly-transformed sub-shape would.
 */

export type Vec2 = readonly [number, number]

export interface PathCmd { type: 'M' | 'L' | 'C'; pts: Array<Vec2> }

/** Predicate selecting which points belong to a joint's movable region. */
export type Region = (p: Vec2) => boolean

export interface Joint {
  pivot: Vec2
  contains: Region
  /**
   * Horizontal distance from the pivot (shoulder) at which a point counts as
   * fully "at the hand". Used by the `liftY` pose to weight the vertical lift so
   * the shoulder stays put and the hand (and anything past `reach`) moves the
   * full amount.
   */
  reach: number
}

const POINTS_PER_CMD = { M: 1, L: 1, C: 3 } as const

function isCommand(token: string): token is 'M' | 'L' | 'C' {
  return token === 'M' || token === 'L' || token === 'C'
}

/**
 * Parse a path made of absolute `M`/`L`/`C` commands. Handles implicit command
 * repetition (a run of coordinates after a single command letter). An implicit
 * repeat of `M` becomes `L`, per the SVG spec.
 */
export function parsePath(d: string): Array<PathCmd> {
  const tokens = d.match(/[MLC]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []
  const cmds: Array<PathCmd> = []

  let i = 0
  let active: 'M' | 'L' | 'C' | null = null

  while (i < tokens.length) {
    const token = tokens[i]

    if (isCommand(token)) {
      active = token
      i += 1
      continue
    }

    if (active === null) break

    const type = active === 'M' && cmds.length > 0 ? 'L' : active
    const count = POINTS_PER_CMD[type]
    const pts: Array<Vec2> = []

    for (let p = 0; p < count; p += 1) {
      const x = Number(tokens[i])
      const y = Number(tokens[i + 1])
      pts.push([x, y])
      i += 2
    }

    cmds.push({ type, pts })

    // After the first `M`, subsequent implicit coordinate runs are line-tos.
    if (active === 'M') active = 'L'
  }

  return cmds
}

function fmt(n: number): string {
  return Number(n.toFixed(3)).toString()
}

export function serializePath(cmds: ReadonlyArray<PathCmd>): string {
  return cmds
    .map((cmd) => {
      const coords = cmd.pts.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join(' ')
      return `${cmd.type} ${coords}`
    })
    .join(' ')
}

export function rotateAbout(p: Vec2, pivot: Vec2, rad: number): Vec2 {
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = p[0] - pivot[0]
  const dy = p[1] - pivot[1]
  return [pivot[0] + dx * cos - dy * sin, pivot[1] + dx * sin + dy * cos]
}

/**
 * How a joint's matched points are transformed:
 * - `rotate`: swing the points about the pivot by `angleDeg` (used by the lone
 *   red figure's greeting wave — an arc is fine there, she holds no hands).
 * - `liftY`: translate the points straight up/down by `dy`, weighted by how far
 *   they sit past the shoulder, so the hand moves the full `dy` in a straight
 *   vertical line while the shoulder stays anchored. Because the offset depends
 *   only on a point's horizontal distance from the pivot — never its `y` — both
 *   edges of the arm shift together and the arm keeps its thickness. Neighbours
 *   driven by the same `dy` therefore keep their joined hands connected.
 */
export type Pose =
  | { kind: 'rotate'; joint: Joint; angleDeg: number }
  | { kind: 'liftY'; joint: Joint; dy: number }

function isRest(pose: Pose): boolean {
  return pose.kind === 'rotate' ? pose.angleDeg === 0 : pose.dy === 0
}

/** Smoothstep on a value already clamped to [0, 1]. */
function smoothstep(w: number): number {
  return w * w * (3 - 2 * w)
}

function applyPose(p: Vec2, pose: Pose): Vec2 {
  if (pose.kind === 'rotate') {
    return rotateAbout(p, pose.joint.pivot, (pose.angleDeg * Math.PI) / 180)
  }
  const dist = Math.abs(p[0] - pose.joint.pivot[0])
  const weight = smoothstep(Math.min(1, dist / pose.joint.reach))
  return [p[0], p[1] + pose.dy * weight]
}

/**
 * Apply each pose to every point its joint matches.
 *
 * Returns `d` unchanged when every pose is at rest (angle/dy 0), so the rest
 * pose is SSR-safe, zero-cost, and byte-identical to the original source path.
 */
export function poseFigure(d: string, poses: ReadonlyArray<Pose>): string {
  if (poses.every(isRest)) return d

  const active = poses.filter((pose) => !isRest(pose))
  const cmds = parsePath(d)

  const posed = cmds.map((cmd) => ({
    type: cmd.type,
    pts: cmd.pts.map((pt) => {
      let next = pt
      for (const pose of active) {
        if (pose.joint.contains(next)) next = applyPose(next, pose)
      }
      return next
    }),
  }))

  return serializePath(posed)
}

/**
 * Build a region predicate from an axis-aligned bounding box. Any omitted bound
 * is treated as unbounded, so `{ minX: 70 }` selects every point to the right
 * of x=70 — convenient for grabbing an arm-tip cluster.
 */
export function armRegion(o: {
  minX?: number
  maxX?: number
  minY?: number
  maxY?: number
}): Region {
  return ([x, y]) =>
    (o.minX === undefined || x >= o.minX) &&
    (o.maxX === undefined || x <= o.maxX) &&
    (o.minY === undefined || y >= o.minY) &&
    (o.maxY === undefined || y <= o.maxY)
}
