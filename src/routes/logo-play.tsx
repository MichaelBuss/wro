import { createFileRoute } from '@tanstack/solid-router'
import { For, createSignal } from 'solid-js'
import { ANIMATION_POOL } from '~/components/nav/logo/animations'
import { createLogoAnimation } from '~/components/nav/logo/createLogoAnimation'
import { FIGURES, WRO_TEXT_D } from '~/components/nav/logo/figures'
import { DEFAULT_INTERACTIVE } from '~/components/nav/logo/interactive'
import type { InteractiveConfig } from '~/components/nav/logo/interactive'
import { WroFigure } from '~/components/nav/logo/WroFigure'

// THROWAWAY tuning harness for the interactive ("follow the mouse") logo.
// Move your cursor over the big mark, dial in the feel with the sliders, then
// bake the winning numbers into DEFAULT_INTERACTIVE and delete this route
// (/logo-play). Hover is motion-only — colour stays with the movies.

export const Route = createFileRoute('/logo-play')({ component: LogoPlay })

interface SliderSpec {
  key: keyof InteractiveConfig
  label: string
  min: number
  max: number
  step: number
}

const SLIDERS: ReadonlyArray<SliderSpec> = [
  { key: 'liftPx', label: 'crest · lift (px)', min: 0, max: 60, step: 1 },
  { key: 'bumpWidth', label: 'crest · bump width', min: 0.02, max: 0.25, step: 0.005 },
  { key: 'springLag', label: 'crest · spring lag', min: 0.03, max: 0.6, step: 0.01 },
  { key: 'influenceIn', label: 'crest · fade in', min: 0.02, max: 0.4, step: 0.01 },
  { key: 'influenceOut', label: 'crest · fade out', min: 0.02, max: 0.4, step: 0.01 },
  { key: 'redRange', label: 'red girl · range (right)', min: 0.01, max: 0.15, step: 0.005 },
  { key: 'trackDeg', label: 'red girl · wave (°)', min: 0, max: 45, step: 1 },
  { key: 'bobDeg', label: 'red girl · wave wobble (°)', min: 0, max: 10, step: 0.5 },
]

function LogoPlay() {
  const [config, setConfig] = createSignal<InteractiveConfig>({ ...DEFAULT_INTERACTIVE })
  const anim = createLogoAnimation(ANIMATION_POOL, FIGURES.length, config)

  const normalizedX = (event: PointerEvent): number => {
    const target = event.currentTarget
    if (!(target instanceof Element)) return 0.5
    const rect = target.getBoundingClientRect()
    if (rect.width === 0) return 0.5
    return Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  }

  const set = (key: keyof InteractiveConfig, value: number) =>
    setConfig((prev) => ({ ...prev, [key]: value }))

  return (
    <div style={{ padding: '24px', 'font-family': 'system-ui, sans-serif', display: 'flex', gap: '32px', 'flex-wrap': 'wrap' }}>
      <div style={{ flex: '1 1 560px', 'min-width': '320px' }}>
        <h1 style={{ 'font-size': '20px', 'margin-bottom': '4px' }}>Interactive logo playground</h1>
        <p style={{ 'font-size': '13px', color: '#666', 'margin-bottom': '16px' }}>
          Move your cursor across the mark below. Hover is motion-only; tune the feel with the panel.
        </p>

        <div
          style={{ border: '1px solid #ddd', 'border-radius': '8px', background: '#fff', padding: '24px', cursor: 'crosshair' }}
        >
          <svg
            viewBox="0 -4 1152 171"
            style={{ width: '100%', height: 'auto' }}
            role="img"
            aria-label="WRO Danmark"
            onPointerEnter={(e) => anim.pointerEnter(normalizedX(e))}
            onPointerMove={(e) => anim.pointerMove(normalizedX(e))}
            onPointerLeave={() => anim.pointerLeave()}
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
            <path class="wro-wordmark" d={WRO_TEXT_D} fill="currentColor" fill-rule="evenodd" />
          </svg>
        </div>

        <div style={{ 'margin-top': '12px', display: 'flex', gap: '8px' }}>
          <button type="button" onClick={() => anim.play()} style={btn}>
            Play random movie
          </button>
          <button type="button" onClick={() => setConfig({ ...DEFAULT_INTERACTIVE })} style={btn}>
            Reset defaults
          </button>
        </div>
      </div>

      <div style={{ flex: '0 0 300px', 'font-size': '13px' }}>
        <For each={SLIDERS}>
          {(spec) => (
            <label style={{ display: 'block', 'margin-bottom': '12px' }}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', color: '#444' }}>
                <span>{spec.label}</span>
                <span style={{ 'font-variant-numeric': 'tabular-nums', color: '#999' }}>
                  {config()[spec.key]}
                </span>
              </div>
              <input
                type="range"
                min={spec.min}
                max={spec.max}
                step={spec.step}
                value={config()[spec.key]}
                onInput={(e) => set(spec.key, Number(e.currentTarget.value))}
                style={{ width: '100%' }}
              />
            </label>
          )}
        </For>

        <pre style={{ 'margin-top': '16px', padding: '12px', background: '#f7f7f7', 'border-radius': '6px', 'font-size': '11px', 'white-space': 'pre-wrap' }}>
          {JSON.stringify(config(), null, 2)}
        </pre>
      </div>
    </div>
  )
}

const btn = {
  padding: '6px 12px',
  border: '1px solid #ccc',
  'border-radius': '6px',
  background: '#f3f3f3',
  cursor: 'pointer',
  'font-size': '13px',
} as const
