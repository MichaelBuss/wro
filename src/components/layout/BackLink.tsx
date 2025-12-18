import { Link } from '@tanstack/solid-router'
import { ArrowLeft } from 'lucide-solid'

interface BackLinkProps {
  to?: string
  label?: string
}

export function BackLink(props: BackLinkProps) {
  return (
    <Link
      to={props.to ?? '/'}
      class="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors mb-8"
    >
      <ArrowLeft size={20} />
      <span>{props.label ?? 'Tilbage til forsiden'}</span>
    </Link>
  )
}
