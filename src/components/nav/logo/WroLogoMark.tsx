import { For, createEffect } from 'solid-js'
import { ANIMATION_POOL } from './animations'
import { createLogoAnimation } from './createLogoAnimation'
import { FIGURES, WRO_TEXT_D } from './figures'
import { WroFigure } from './WroFigure'

/**
 * The WRO people-chain mark, rebuilt as an inline themeable SVG: the
 * seven-figure rainbow chain holding hands plus the lone red figure with a
 * raised, waving arm. Each figure is individually colourable via the
 * `--wro-logo-*` CSS variables.
 *
 * With no props the mark renders the static original (SSR-safe — every figure
 * is at its rest pose). `interactive` wires hover/focus to a random animation
 * from the pool; `animation` forces a specific named one. All motion is gated
 * behind `prefers-reduced-motion`.
 */

interface WroLogoMarkProps {
  class?: string
  /** Wire hover/focus to play a random animation. Defaults to static. */
  interactive?: boolean
  /** Force a specific named animation (controlled). */
  animation?: string
}

export function WroLogoMark(props: WroLogoMarkProps) {
  const anim = createLogoAnimation(ANIMATION_POOL, FIGURES.length)

  const playRandom = () => {
    if (props.interactive) anim.play()
  }

  createEffect(() => {
    const name = props.animation
    if (name === undefined) return
    anim.stop()
    anim.play(name)
  })

  return (
    <svg
      class={[props.class, anim.activeClass()].filter(Boolean).join(' ')}
      viewBox="0 0 1152 260"
      role="img"
      aria-label="WRO Danmark"
      onMouseEnter={playRandom}
      onFocusIn={playRandom}
    >
      <g class="wro-figs">
        <For each={FIGURES}>
          {(figure, index) => (
            <WroFigure
              figure={figure}
              mode={anim.armMode}
              amounts={() => anim.armAmounts(index())}
            />
          )}
        </For>
      </g>

      <path class="wro-wordmark" d={WRO_TEXT_D} fill="currentColor" fill-rule="evenodd" />
    </svg>
  )
}
