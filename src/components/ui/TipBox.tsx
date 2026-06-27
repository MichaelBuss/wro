import type { JSX } from 'solid-js'

interface TipBoxProps {
  title: string
  children: JSX.Element
  class?: string
}

export function TipBox(props: TipBoxProps) {
  return (
    <div
      class={`p-6 bg-secondary border border-border rounded-lg ${props.class ?? ''}`}
    >
      <h3 class="font-sans text-h5 font-medium text-foreground mb-3">
        {props.title}
      </h3>
      <p class="text-sm-copy text-foreground/80">{props.children}</p>
    </div>
  )
}
