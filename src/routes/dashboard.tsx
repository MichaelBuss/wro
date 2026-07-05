import {
  Link,
  createFileRoute,
  redirect,
  useRouter,
} from '@tanstack/solid-router'
import { For, Show, createSignal } from 'solid-js'
import { PageShell } from '~/components/layout'
import { Button, Heading, Lead, StatusBadge } from '~/components/ui'
import { deleteMyAccountFn, exportMyDataFn } from '~/lib/account-functions'
import { authClient } from '~/lib/auth-client'
import { getSessionWithRole } from '~/lib/auth-functions'
import { decideDashboardAccess } from '~/lib/dashboard-access'
import { listMyPasskeysFn, removePasskeyFn } from '~/lib/recovery-functions'
import {
  createTeamFn,
  listTeamsFn,
  renameTeamFn,
  withdrawTeamFn,
} from '~/lib/team-functions'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const session = await getSessionWithRole()
    const access = decideDashboardAccess(session)

    if (access.type === 'redirect') {
      throw redirect({ to: access.to })
    }

    // Organizers have their own area — coaches only beyond this point.
    if (session?.user.role === 'organizer') {
      throw redirect({ to: '/organizer' })
    }

    return { user: access.user }
  },
  loader: async () => {
    const [teams, passkeys] = await Promise.all([
      listTeamsFn(),
      listMyPasskeysFn(),
    ])
    return { teams, passkeys }
  },
  component: Dashboard,
})

function Dashboard() {
  const context = Route.useRouteContext()
  const loaderData = Route.useLoaderData()
  const navigate = Route.useNavigate()
  const router = useRouter()

  const [newTeamName, setNewTeamName] = createSignal('')
  const [isSubmitting, setIsSubmitting] = createSignal(false)
  const [renamingId, setRenamingId] = createSignal<string | null>(null)
  const [renameValue, setRenameValue] = createSignal('')

  type DeleteStep = 'idle' | 'confirming' | 'deleting'
  const [deleteStep, setDeleteStep] = createSignal<DeleteStep>('idle')

  const [passkeyBusy, setPasskeyBusy] = createSignal(false)
  const [passkeyError, setPasskeyError] = createSignal<string | null>(null)
  const [removingPasskeyId, setRemovingPasskeyId] = createSignal<string | null>(
    null,
  )

  async function signOut() {
    await authClient.signOut()
    await navigate({ to: '/login' })
  }

  async function handleExportData() {
    const data = await exportMyDataFn()
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'wro-mine-data.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function handleDeleteAccount() {
    setDeleteStep('deleting')
    try {
      await deleteMyAccountFn()
      await authClient.signOut()
      await navigate({ to: '/' })
    } catch {
      setDeleteStep('confirming')
    }
  }

  async function handleCreateTeam(e: SubmitEvent) {
    e.preventDefault()
    const name = newTeamName().trim()
    if (!name) return
    setIsSubmitting(true)
    try {
      await createTeamFn({ data: { name } })
      setNewTeamName('')
      await router.invalidate()
    } finally {
      setIsSubmitting(false)
    }
  }

  function startRename(teamId: string, currentName: string) {
    setRenamingId(teamId)
    setRenameValue(currentName)
  }

  function cancelRename() {
    setRenamingId(null)
    setRenameValue('')
  }

  async function handleRename(teamId: string, e: SubmitEvent) {
    e.preventDefault()
    const name = renameValue().trim()
    if (!name) return
    await renameTeamFn({ data: { teamId, name } })
    setRenamingId(null)
    await router.invalidate()
  }

  async function handleWithdraw(teamId: string) {
    await withdrawTeamFn({ data: { teamId } })
    await router.invalidate()
  }

  async function handleAddPasskey() {
    setPasskeyError(null)
    setPasskeyBusy(true)
    await authClient.passkey.addPasskey({
      fetchOptions: {
        onError: (ctx) => {
          setPasskeyBusy(false)
          setPasskeyError(ctx.error.message)
        },
        onSuccess: async () => {
          setPasskeyBusy(false)
          await router.invalidate()
        },
      },
    })
  }

  async function handleRemovePasskey(passkeyId: string) {
    setRemovingPasskeyId(passkeyId)
    try {
      await removePasskeyFn({ data: { passkeyId } })
      await router.invalidate()
    } finally {
      setRemovingPasskeyId(null)
    }
  }

  return (
    <PageShell size="sm">
      <div class="max-w-lg mx-auto">
        <Heading level="h1" class="mb-2">
          Hej, {context().user.name}
        </Heading>
        <Lead class="text-muted-foreground mb-8">
          Du er logget ind som {context().user.email}.
        </Lead>

        <section class="mb-10">
          <Heading level="h2" class="mb-4">
            Dine hold
          </Heading>

          <Show
            when={loaderData().teams.length > 0}
            fallback={
              <p class="text-sm text-muted-foreground mb-4">
                Du har endnu ikke oprettet et hold.
              </p>
            }
          >
            <ul class="space-y-2 mb-6">
              <For each={loaderData().teams}>
                {(t) => (
                  <li class="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                    <Show
                      when={renamingId() === t.id}
                      fallback={
                        <>
                          <span class="flex-1 font-medium">{t.name}</span>
                          <StatusBadge status={t.status} />
                          <Show when={t.status === 'draft'}>
                            <Link
                              to="/dashboard/$teamId"
                              params={{ teamId: t.id }}
                              class="text-sm text-primary hover:underline px-2"
                            >
                              Redigér
                            </Link>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => startRename(t.id, t.name)}
                            >
                              Omdøb
                            </Button>
                          </Show>
                          <Show
                            when={
                              t.status === 'submitted' ||
                              t.status === 'confirmed' ||
                              t.status === 'waitlisted'
                            }
                          >
                            <Link
                              to="/dashboard/$teamId"
                              params={{ teamId: t.id }}
                              class="text-sm text-muted-foreground hover:underline px-2"
                            >
                              Se hold
                            </Link>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleWithdraw(t.id)}
                            >
                              Træk tilbage
                            </Button>
                          </Show>
                        </>
                      }
                    >
                      <form
                        class="flex flex-1 items-center gap-2"
                        onSubmit={(e) => void handleRename(t.id, e)}
                      >
                        <input
                          class="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          value={renameValue()}
                          onInput={(e) => setRenameValue(e.currentTarget.value)}
                          autofocus
                          required
                          maxLength={100}
                        />
                        <Button type="submit" size="sm">
                          Gem
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={cancelRename}
                        >
                          Annuller
                        </Button>
                      </form>
                    </Show>
                  </li>
                )}
              </For>
            </ul>
          </Show>

          <form
            class="flex items-center gap-2"
            onSubmit={(e) => void handleCreateTeam(e)}
          >
            <input
              class="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Holdnavn"
              value={newTeamName()}
              onInput={(e) => setNewTeamName(e.currentTarget.value)}
              required
              maxLength={100}
              disabled={isSubmitting()}
            />
            <Button type="submit" disabled={isSubmitting()}>
              Opret hold
            </Button>
          </form>
        </section>

        <section class="mb-10 border-t border-border pt-8">
          <Heading level="h2" class="mb-1">
            Adgangsnøgler
          </Heading>
          <p class="text-sm text-muted-foreground mb-4">
            Du kan tilføje flere enheder (f.eks. din bærbare computer) som
            adgangsnøgler, og fjerne dem du ikke længere bruger.
          </p>

          <ul class="space-y-2 mb-4">
            <For each={loaderData().passkeys}>
              {(key) => (
                <li class="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                  <span class="flex-1 text-sm">
                    {key.name ?? 'Unavngivet enhed'}
                    <span class="ml-2 text-xs text-muted-foreground">
                      (tilføjet{' '}
                      {key.createdAt
                        ? new Date(key.createdAt).toLocaleDateString('da-DK')
                        : '—'}
                      )
                    </span>
                  </span>
                  <Show when={loaderData().passkeys.length > 1}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      class="text-destructive hover:text-destructive"
                      disabled={removingPasskeyId() === key.id}
                      onClick={() => void handleRemovePasskey(key.id)}
                    >
                      Fjern
                    </Button>
                  </Show>
                </li>
              )}
            </For>
          </ul>

          <Button
            type="button"
            variant="outline"
            disabled={passkeyBusy()}
            onClick={() => void handleAddPasskey()}
          >
            Tilføj enhed
          </Button>

          <Show when={passkeyError()}>
            {(msg) => (
              <p class="mt-2 text-sm text-destructive" role="alert">
                {msg()}
              </p>
            )}
          </Show>
        </section>

        <section class="mb-10 border-t border-border pt-8">
          <Heading level="h2" class="mb-1">
            Mine data
          </Heading>
          <p class="text-sm text-muted-foreground mb-4">
            Du kan til enhver tid hente en kopi af dine data eller slette din
            konto og alt tilknyttet indhold (hold og deltagere).
          </p>

          <div class="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleExportData()}
            >
              Eksportér mine data
            </Button>

            <Show when={deleteStep() === 'idle'}>
              <Button
                type="button"
                variant="outline"
                class="text-destructive border-destructive/40 hover:bg-destructive/5"
                onClick={() => setDeleteStep('confirming')}
              >
                Slet konto
              </Button>
            </Show>
          </div>

          <Show when={deleteStep() === 'confirming'}>
            <div class="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <p class="text-sm font-medium text-destructive">
                Er du sikker? Denne handling kan ikke fortrydes.
              </p>
              <p class="text-sm text-muted-foreground">
                Alle dine hold og deltagere slettes permanent. Vi anbefaler, at
                du eksporterer dine data først.
              </p>
              <div class="flex flex-wrap gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleExportData()}
                >
                  Eksportér mine data
                </Button>
                <Button
                  type="button"
                  size="sm"
                  class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => void handleDeleteAccount()}
                >
                  Ja, slet min konto permanent
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteStep('idle')}
                >
                  Annuller
                </Button>
              </div>
            </div>
          </Show>

          <Show when={deleteStep() === 'deleting'}>
            <p class="mt-4 text-sm text-muted-foreground">Sletter konto…</p>
          </Show>
        </section>

        <Button type="button" variant="outline" onClick={() => void signOut()}>
          Log ud
        </Button>
      </div>
    </PageShell>
  )
}
