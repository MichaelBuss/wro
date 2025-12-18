import type { LucideProps } from 'lucide-solid'
import type { Component } from 'solid-js'

interface PageHeaderProps {
  icon: Component<LucideProps>
  title: string
}

export function PageHeader(props: PageHeaderProps) {
  return (
    <div class="flex items-center gap-4 mb-8">
      <props.icon class="w-10 h-10 text-wro-blue-500" />
      <h1 class="text-4xl md:text-5xl font-bold text-slate-800">
        {props.title}
      </h1>
    </div>
  )
}
