import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { cx } from '~/cva.config'

type HeadingLevel = 'display' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5'
type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'p' | 'span'

interface HeadingProps {
  level: HeadingLevel
  as?: HeadingTag
  class?: string
  children: JSX.Element
}

const levelClasses: Record<HeadingLevel, string> = {
  display: 'font-serif text-display text-foreground',
  h1: 'font-serif text-h1 text-foreground',
  h2: 'font-sans text-h2 font-semibold text-foreground',
  h3: 'font-sans text-h3 font-semibold text-foreground',
  h4: 'font-sans text-h4 font-medium text-foreground',
  h5: 'font-sans text-h5 font-medium text-foreground',
}

const levelDefaultTag: Record<HeadingLevel, HeadingTag> = {
  display: 'h1',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
}

export function Heading(props: HeadingProps) {
  return (
    <Dynamic
      component={props.as ?? levelDefaultTag[props.level]}
      class={cx(levelClasses[props.level], props.class)}
    >
      {props.children}
    </Dynamic>
  )
}
