import type { JSX } from 'solid-js'

interface TipBoxProps {
  title: string
  children: JSX.Element
  class?: string
}

export function TipBox(props: TipBoxProps) {
  return (
    <div
      class={`p-6 bg-cyan-500/10 border border-cyan-500/30 rounded-lg ${props.class ?? ''}`}
    >
      <h3 class="text-lg font-semibold text-cyan-400 mb-3">{props.title}</h3>
      <p class="text-gray-300">{props.children}</p>
    </div>
  )
}
