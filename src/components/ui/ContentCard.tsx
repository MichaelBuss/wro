import type { JSX } from 'solid-js'
import { Show } from 'solid-js'

interface ContentCardProps {
  title?: string
  children: JSX.Element
  class?: string
}

export function ContentCard(props: ContentCardProps) {
  return (
    <div
      class={`bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 ${props.class ?? ''}`}
    >
      <Show when={props.title}>
        <h2 class="text-2xl font-semibold text-white mb-6">{props.title}</h2>
      </Show>
      {props.children}
    </div>
  )
}
