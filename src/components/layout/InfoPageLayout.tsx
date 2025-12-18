import type { JSX } from 'solid-js'

interface InfoPageLayoutProps {
  children: JSX.Element
}

export function InfoPageLayout(props: InfoPageLayoutProps) {
  return (
    <div class="min-h-screen bg-gray-50">
      <section class="py-16 px-6 max-w-4xl mx-auto">{props.children}</section>
    </div>
  )
}
