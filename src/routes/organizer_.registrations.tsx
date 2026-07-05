import {
  Link,
  createFileRoute,
  redirect,
  useRouter,
} from '@tanstack/solid-router'
import { For, Show } from 'solid-js'
import { z } from 'zod'
import { PageShell } from '~/components/layout'
import { Button, Heading, PaymentBadge, StatusBadge } from '~/components/ui'
import { decideOrganizerAccess, getSessionWithRole } from '~/lib/auth-functions'
import {
  confirmTeamFn,
  listAllTeamsFn,
  returnTeamToDraftFn,
  setPaymentStatusFn,
  waitlistTeamFn,
  withdrawTeamAsOrganizerFn,
} from '~/lib/organizer-functions'
import { paymentStatuses } from '~/server/db/schema'

const paymentStatusSchema = z.enum(paymentStatuses)

export const Route = createFileRoute('/organizer_/registrations')({
  beforeLoad: async () => {
    const session = await getSessionWithRole()
    const access = decideOrganizerAccess(session?.user)

    if (access.type === 'redirect') {
      throw redirect({ to: access.to })
    }

    return { user: access.user }
  },
  loader: async () => {
    const teams = await listAllTeamsFn()
    return { teams }
  },
  component: OrganizerRegistrations,
})

function OrganizerRegistrations() {
  const loaderData = Route.useLoaderData()
  const router = useRouter()

  async function handleConfirm(teamId: string) {
    await confirmTeamFn({ data: { teamId } })
    await router.invalidate()
  }

  async function handleWaitlist(teamId: string) {
    await waitlistTeamFn({ data: { teamId } })
    await router.invalidate()
  }

  async function handleReturnToDraft(teamId: string) {
    await returnTeamToDraftFn({ data: { teamId } })
    await router.invalidate()
  }

  async function handleWithdraw(teamId: string) {
    await withdrawTeamAsOrganizerFn({ data: { teamId } })
    await router.invalidate()
  }

  async function handleSetPayment(
    teamId: string,
    paymentStatus: z.infer<typeof paymentStatusSchema>,
  ) {
    await setPaymentStatusFn({ data: { teamId, paymentStatus } })
    await router.invalidate()
  }

  return (
    <PageShell size="lg">
      <div class="mb-6 flex items-center gap-3">
        <Link
          to="/organizer"
          class="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Tilbage til arrangør-panel
        </Link>
      </div>

      <Heading level="h1" class="mb-6">
        Tilmeldinger
      </Heading>

      <Show
        when={loaderData().teams.length > 0}
        fallback={
          <p class="text-sm text-muted-foreground">
            Ingen hold tilmeldt endnu.
          </p>
        }
      >
        <div class="space-y-4">
          <For each={loaderData().teams}>
            {(entry) => (
              <div class="rounded-lg border border-border bg-card">
                {/* Header row */}
                <div class="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-border">
                  <span class="flex-1 font-semibold text-base">
                    {entry.team.name}
                  </span>
                  <StatusBadge status={entry.team.status} />
                  <PaymentBadge status={entry.team.paymentStatus} />
                  <Show when={entry.hasEligibilityWarning}>
                    <span class="rounded-full bg-yellow-100 text-yellow-800 px-2 py-0.5 text-xs font-medium">
                      Aldersuoverens­stemmelse
                    </span>
                  </Show>
                </div>

                {/* Details */}
                <div class="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div>
                    <span class="text-muted-foreground">Kategori: </span>
                    <span>{entry.category ? entry.category.name : '—'}</span>
                  </div>
                  <div>
                    <span class="text-muted-foreground">Deltagere: </span>
                    <span>{entry.participants.length}</span>
                  </div>
                  <Show when={entry.team.responsibleAdultName}>
                    <div class="sm:col-span-2">
                      <span class="text-muted-foreground">
                        Ansvarlig voksen:{' '}
                      </span>
                      <span>
                        {entry.team.responsibleAdultName}
                        {entry.team.responsibleAdultPhone
                          ? ` · ${entry.team.responsibleAdultPhone}`
                          : ''}
                        {entry.team.responsibleAdultEmail
                          ? ` · ${entry.team.responsibleAdultEmail}`
                          : ''}
                      </span>
                    </div>
                  </Show>
                  <Show when={entry.team.organization}>
                    <div>
                      <span class="text-muted-foreground">Organisation: </span>
                      <span>{entry.team.organization}</span>
                    </div>
                  </Show>
                </div>

                {/* Action buttons */}
                <div class="flex flex-wrap items-center gap-2 px-5 py-3 border-t border-border bg-muted/30">
                  {/* Registration status actions */}
                  <Show
                    when={
                      entry.team.status === 'submitted' ||
                      entry.team.status === 'waitlisted'
                    }
                  >
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleConfirm(entry.team.id)}
                    >
                      Bekræft
                    </Button>
                  </Show>
                  <Show
                    when={
                      entry.team.status === 'submitted' ||
                      entry.team.status === 'confirmed'
                    }
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleWaitlist(entry.team.id)}
                    >
                      Venteliste
                    </Button>
                  </Show>
                  <Show
                    when={
                      entry.team.status === 'submitted' ||
                      entry.team.status === 'confirmed' ||
                      entry.team.status === 'waitlisted'
                    }
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleReturnToDraft(entry.team.id)}
                    >
                      Retur til kladde
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => void handleWithdraw(entry.team.id)}
                    >
                      Træk tilbage
                    </Button>
                  </Show>

                  {/* Payment status selector */}
                  <div class="ml-auto flex items-center gap-2">
                    <span class="text-xs text-muted-foreground">Betaling:</span>
                    <select
                      class="rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      value={entry.team.paymentStatus}
                      onChange={(e) =>
                        void handleSetPayment(
                          entry.team.id,
                          paymentStatusSchema.parse(e.currentTarget.value),
                        )
                      }
                    >
                      <option value="unpaid">Ubetalt</option>
                      <option value="paid">Betalt</option>
                      <option value="waived">Fritaget</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </PageShell>
  )
}
