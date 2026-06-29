import { createMemo } from 'solid-js'
import type { Figure } from './figures'
import { poseFigure } from './pathRig'
import type { Pose } from './pathRig'

interface WroFigureProps {
  figure: Figure
  /** How `amounts` move the arms: `rotate` (degrees) or `liftY` (px, up = −). */
  mode: () => 'rotate' | 'liftY'
  /** Per-arm amount; index 0 = left arm, 1 = right arm. Units follow `mode`. */
  amounts: () => Array<number>
}

/**
 * A single WRO figure. Memoises its posed path `d` from the base outline plus
 * the current arm amounts. At rest (all amounts 0) `poseFigure` returns the base
 * `d` unchanged, so this is zero-cost and SSR-safe until something animates.
 */
export function WroFigure(props: WroFigureProps) {
  const posed = createMemo(() => {
    const mode = props.mode()
    const poses: Array<Pose> = props.figure.arms.map((joint, i) => {
      const amount = props.amounts()[i] ?? 0
      return mode === 'liftY'
        ? { kind: 'liftY', joint, dy: amount }
        : { kind: 'rotate', joint, angleDeg: amount }
    })
    return poseFigure(props.figure.d, poses)
  })

  return (
    <g class="wro-fig" style={{ '--wro-fig-color': props.figure.color }}>
      <path d={posed()} />
    </g>
  )
}
