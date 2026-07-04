import { createFileRoute, redirect, useRouter } from '@tanstack/solid-router'
import { For, Show, createSignal } from 'solid-js'
import { PageShell } from '~/components/layout'
import { Button, Heading, Lead } from '~/components/ui'
import { authClient } from '~/lib/auth-client'
import { getSession } from '~/lib/auth-functions'
import { decideDashboardAccess } from '~/lib/dashboard-access'
import { createTeamFn, listTeamsFn, renameTeamFn } from '~/lib/team-functions'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const session = await getSession()
    const access = decideDashboardAccess(session)

    if (access.type === 'redirect') {
      throw redirect({ to: access.to })
    }

    return { user: access.user }
  },
  loader: async () => {
    const teams = await listTeamsFn()
    return { teams }
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

  async function signOut() {
    await authClient.signOut()
    await navigate({ to: '/login' })
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
                          <span class="rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 text-xs font-medium">
                            Kladde
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => startRename(t.id, t.name)}
                          >
                            Omdøb
                          </Button>
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

        <Button type="button" variant="outline" onClick={() => void signOut()}>
          Log ud
        </Button>
      </div>
    </PageShell>
  )
}
