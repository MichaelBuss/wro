import type { JSX } from 'solid-js'
import { Show } from 'solid-js'
import { cx } from '~/cva.config'

const proseBase = cx(
  'prose prose-lg max-w-none',
  'prose-headings:font-serif prose-headings:text-foreground prose-headings:font-normal',
  'prose-p:text-foreground/80 prose-p:leading-relaxed',
  'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
  'prose-strong:text-foreground',
  'prose-ul:text-foreground/80 prose-ol:text-foreground/80',
  'prose-li:marker:text-primary',
  'prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:rounded',
  'prose-pre:bg-muted prose-pre:border prose-pre:border-border',
)

interface ProseProps {
  children?: JSX.Element
  html?: string
  class?: string
}

export function Prose(props: ProseProps) {
  return (
    <Show
      when={props.html !== undefined}
      fallback={<div class={cx(proseBase, props.class)}>{props.children}</div>}
    >
      <div
        class={cx(proseBase, props.class)}
        // Content is repo-managed markdown (committed files, not user input).
        // Rule suppressed via eslint.config.js file-level override.
        innerHTML={props.html}
      />
    </Show>
  )
}
