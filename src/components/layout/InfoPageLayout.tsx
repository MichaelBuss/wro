import type { LucideProps } from 'lucide-solid'
import type { Component, JSX } from 'solid-js'
import { BackLink } from './BackLink'
import { PageHeader } from './PageHeader'
import { PageShell } from './PageShell'

interface InfoPageLayoutProps {
  icon: Component<LucideProps>
  title: string
  children: JSX.Element
}

export function InfoPageLayout(props: InfoPageLayoutProps) {
  return (
    <PageShell>
      <BackLink />
      <PageHeader icon={props.icon} title={props.title} />
      {props.children}
    </PageShell>
  )
}
