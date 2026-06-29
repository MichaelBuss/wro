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

// Serif (Fraunces) carries the editorial voice for the display + section
// headings; the smaller sub-headings stay in the sans face so they read as
// UI/labels rather than competing with the section titles.
const levelClasses: Record<HeadingLevel, string> = {
  display: 'font-serif font-normal text-display text-foreground',
  h1: 'font-serif font-normal text-h1 text-foreground',
  h2: 'font-serif font-medium text-h2 text-foreground',
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
