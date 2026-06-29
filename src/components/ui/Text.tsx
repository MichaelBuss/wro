import type { JSX } from 'solid-js'
import { cx } from '~/cva.config'

interface TextProps {
  class?: string
  children: JSX.Element
}

export function Lead(props: TextProps) {
  return (
    <p class={cx('text-lead text-foreground/75', props.class)}>
      {props.children}
    </p>
  )
}

export function Caption(props: TextProps) {
  return (
    <span
      class={cx(
        'text-caption text-muted-foreground font-serif italic',
        props.class,
      )}
    >
      {props.children}
    </span>
  )
}
