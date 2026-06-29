import { For, createEffect, onCleanup, onMount } from 'solid-js'
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
 * is at its rest pose). `interactive` wires two behaviours:
 * - **hover** → the chain's wave crest follows the cursor and the red girl
 *   waves toward it, with a sticky colour chase (see `interactive.ts`);
 * - **movies** → a random clip plays once per session on load and again when
 *   the tab/window regains focus (never on hover).
 *
 * `animation` forces a specific named clip (controlled). All motion is gated
 * behind `prefers-reduced-motion`.
 */

interface WroLogoMarkProps {
  class?: string
  /** Wire cursor-follow + load/refocus movies. Defaults to static. */
  interactive?: boolean
  /** Force a specific named clip (controlled). */
  animation?: string
}

/** Min gap between auto-played movies so rapid alt-tabbing doesn't spam them. */
const MOVIE_INTERVAL_MS = 20_000
const SESSION_KEY = 'wro-logo-greeted'

export function WroLogoMark(props: WroLogoMarkProps) {
  const anim = createLogoAnimation(ANIMATION_POOL, FIGURES.length)
  let svgEl: SVGSVGElement | undefined

  createEffect(() => {
    const name = props.animation
    if (name === undefined) return
    anim.stop()
    anim.play(name)
  })

  // Tracked on the window (not the SVG) so the red girl can greet a cursor that
  // approaches her hand side without ever touching the tiny mark.
  const onWindowPointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || svgEl === undefined) return
    anim.pointerAt(svgEl.getBoundingClientRect(), event.clientX, event.clientY)
  }

  // Touch has no hover; a tap plays a movie instead. (Inside a <Link to="/">,
  // so this "shows" on the home page; elsewhere the tap just navigates home.)
  const onPointerDown = (event: PointerEvent) => {
    if (!props.interactive || event.pointerType !== 'touch') return
    anim.play()
  }

  let lastMovie = 0
  const maybePlayMovie = () => {
    const now = Date.now()
    if (now - lastMovie < MOVIE_INTERVAL_MS) return
    lastMovie = now
    anim.play()
  }

  onMount(() => {
    if (!props.interactive) return

    // Greet once per session on first load.
    const greeted = sessionStorage.getItem(SESSION_KEY)
    if (greeted === null) {
      sessionStorage.setItem(SESSION_KEY, '1')
      lastMovie = Date.now()
      setTimeout(() => anim.play(), 600)
    }

    // Welcome back when the tab/window regains focus.
    const onVisible = () => {
      if (document.visibilityState === 'visible') maybePlayMovie()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', maybePlayMovie)

    // Follow the cursor across the page; release when it leaves the window.
    window.addEventListener('pointermove', onWindowPointerMove)
    window.addEventListener('blur', anim.pointerLeave)
    document.addEventListener('pointerleave', anim.pointerLeave)

    onCleanup(() => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', maybePlayMovie)
      window.removeEventListener('pointermove', onWindowPointerMove)
      window.removeEventListener('blur', anim.pointerLeave)
      document.removeEventListener('pointerleave', anim.pointerLeave)
    })
  })

  return (
    <svg
      ref={svgEl}
      class={[props.class, anim.activeClass()].filter(Boolean).join(' ')}
      viewBox="0 -4 1152 171"
      role="img"
      aria-label="WRO Danmark"
      onPointerDown={onPointerDown}
    >
      <g class="wro-figs">
        <For each={FIGURES}>
          {(figure, index) => (
            <WroFigure
              figure={figure}
              mode={() => anim.armMode(index())}
              amounts={() => anim.armAmounts(index())}
            />
          )}
        </For>
      </g>

      <path
        class="wro-wordmark"
        d={WRO_TEXT_D}
        fill="currentColor"
        fill-rule="evenodd"
      />
    </svg>
  )
}
