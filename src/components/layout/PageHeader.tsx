import type { LucideProps } from 'lucide-solid'
import type { Component } from 'solid-js'

interface PageHeaderProps {
  icon: Component<LucideProps>
  title: string
}

export function PageHeader(props: PageHeaderProps) {
  return (
    <div class="flex items-center gap-4 mb-8">
      <props.icon class="w-10 h-10 text-cyan-400" />
      <h1 class="text-4xl md:text-5xl font-bold text-white">
        <span class="bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
          {props.title}
        </span>
      </h1>
    </div>
  )
}
