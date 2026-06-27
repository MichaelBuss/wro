import type { JSX } from 'solid-js'

type PageShellSize = 'sm' | 'md' | 'lg'

interface PageShellProps {
  children: JSX.Element
  size?: PageShellSize
}

const sizeClasses: Record<PageShellSize, string> = {
  sm: 'max-w-3xl',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
}

export function PageShell(props: PageShellProps) {
  return (
    <div class="min-h-screen">
      <section
        class={`py-16 px-6 mx-auto ${sizeClasses[props.size ?? 'md']}`}
      >
        {props.children}
      </section>
    </div>
  )
}
