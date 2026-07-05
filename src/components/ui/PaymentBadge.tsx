import type { PaymentStatus } from '~/server/db/schema'

const PAYMENT_CONFIG: Record<PaymentStatus, { label: string; class: string }> =
  {
    unpaid: {
      label: 'Ubetalt',
      class: 'bg-orange-100 text-orange-800',
    },
    paid: {
      label: 'Betalt',
      class: 'bg-green-100 text-green-800',
    },
    waived: {
      label: 'Fritaget',
      class: 'bg-blue-100 text-blue-800',
    },
  }

interface PaymentBadgeProps {
  status: PaymentStatus
}

export function PaymentBadge(props: PaymentBadgeProps) {
  const config = () => PAYMENT_CONFIG[props.status]
  return (
    <span
      class={`rounded-full px-2 py-0.5 text-xs font-medium ${config().class}`}
    >
      {config().label}
    </span>
  )
}
