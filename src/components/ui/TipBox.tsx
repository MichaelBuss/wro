import type { JSX } from 'solid-js'

interface TipBoxProps {
  title: string
  children: JSX.Element
  class?: string
}

export function TipBox(props: TipBoxProps) {
  return (
    <div
      class={`p-6 bg-wro-blue-50 border border-wro-blue-200 rounded-lg ${props.class ?? ''}`}
    >
      <h3 class="text-lg font-semibold text-wro-blue-700 mb-3">
        {props.title}
      </h3>
      <p class="text-slate-600">{props.children}</p>
    </div>
  )
}
