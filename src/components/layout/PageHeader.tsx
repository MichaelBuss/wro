import type { LucideProps } from 'lucide-solid'
import type { Component } from 'solid-js'

interface PageHeaderProps {
  icon: Component<LucideProps>
  title: string
}

export function PageHeader(props: PageHeaderProps) {
  return (
    <div class="flex items-center gap-4 mb-10">
      <props.icon class="w-8 h-8 text-primary shrink-0" />
      <h1 class="font-serif text-h1 text-foreground">{props.title}</h1>
    </div>
  )
}
