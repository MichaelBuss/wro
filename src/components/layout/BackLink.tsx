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
      class="inline-flex items-center gap-2 text-caption text-muted-foreground hover:text-foreground transition-colors mb-8 uppercase tracking-wider"
    >
      <ArrowLeft size={14} />
      <span>{props.label ?? 'Tilbage til forsiden'}</span>
    </Link>
  )
}
