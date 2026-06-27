import type { JSX } from 'solid-js'
import { Show } from 'solid-js'

interface ContentCardProps {
  title?: string
  children: JSX.Element
  class?: string
}

export function ContentCard(props: ContentCardProps) {
  return (
    <div class={`border border-border rounded-lg p-8 ${props.class ?? ''}`}>
      <Show when={props.title}>
        <h2 class="font-sans text-h3 font-semibold text-foreground mb-6">
          {props.title}
        </h2>
      </Show>
      {props.children}
    </div>
  )
}
