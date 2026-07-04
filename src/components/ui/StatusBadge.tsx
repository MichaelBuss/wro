import type { RegistrationStatus } from '~/server/db/schema'

const STATUS_CONFIG: Record<
  RegistrationStatus,
  { label: string; class: string }
> = {
  draft: {
    label: 'Kladde',
    class: 'bg-secondary text-secondary-foreground',
  },
  submitted: {
    label: 'Indsendt',
    class: 'bg-blue-100 text-blue-800',
  },
  confirmed: {
    label: 'Bekræftet',
    class: 'bg-green-100 text-green-800',
  },
  waitlisted: {
    label: 'Venteliste',
    class: 'bg-yellow-100 text-yellow-800',
  },
  withdrawn: {
    label: 'Trukket tilbage',
    class: 'bg-muted text-muted-foreground',
  },
}

interface StatusBadgeProps {
  status: RegistrationStatus
}

export function StatusBadge(props: StatusBadgeProps) {
  const config = () => STATUS_CONFIG[props.status]
  return (
    <span
      class={`rounded-full px-2 py-0.5 text-xs font-medium ${config().class}`}
    >
      {config().label}
    </span>
  )
}
