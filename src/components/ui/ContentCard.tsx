import type { JSX } from 'solid-js'
import { Show } from 'solid-js'
import { cx } from '~/cva.config'
import { Heading } from './Heading'

interface ContentCardProps {
  title?: string
  children: JSX.Element
  class?: string
}

export function ContentCard(props: ContentCardProps) {
  return (
    <div class={cx('border border-border rounded-lg p-8', props.class)}>
      <Show when={props.title}>
        <Heading level="h3" class="mb-6">
          {props.title}
        </Heading>
      </Show>
      {props.children}
    </div>
  )
}
