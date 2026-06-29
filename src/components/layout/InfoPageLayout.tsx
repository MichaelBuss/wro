import type { JSX } from 'solid-js'
import { PageShell } from './PageShell'

interface InfoPageLayoutProps {
  children: JSX.Element
}

export function InfoPageLayout(props: InfoPageLayoutProps) {
  return <PageShell>{props.children}</PageShell>
}
