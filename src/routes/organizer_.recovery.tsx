import { createFileRoute, redirect } from '@tanstack/solid-router'
import { For, Show, createSignal } from 'solid-js'
import { PageShell } from '~/components/layout'
import { Button, Heading, Lead } from '~/components/ui'
import { decideOrganizerAccess, getSessionWithRole } from '~/lib/auth-functions'
import {
  generateRecoveryLinkFn,
  listAccountsForRecoveryFn,
} from '~/lib/recovery-functions'

export const Route = createFileRoute('/organizer_/recovery')({
  beforeLoad: async () => {
    const session = await getSessionWithRole()
    const access = decideOrganizerAccess(session?.user)
    if (access.type === 'redirect') {
      throw redirect({ to: access.to })
    }
    return { user: access.user }
  },
  loader: async () => {
    const accounts = await listAccountsForRecoveryFn()
    return { accounts }
  },
  component: OrganizerRecovery,
})

interface GeneratedLink {
  token: string
  expiresAt: Date
  targetName: string
  targetEmail: string
}

function formatExpiry(date: Date) {
  return new Date(date).toLocaleString('da-DK', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function OrganizerRecovery() {
  const loaderData = Route.useLoaderData()

  const [selectedUserId, setSelectedUserId] = createSignal('')
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const [generated, setGenerated] = createSignal<GeneratedLink | null>(null)
  const [copied, setCopied] = createSignal(false)

  function recoveryUrl(token: string) {
    return `${window.location.origin}/recover?token=${token}`
  }

  async function handleGenerate(e: SubmitEvent) {
    e.preventDefault()
    const targetUserId = selectedUserId()
    if (!targetUserId) return

    setError(null)
    setBusy(true)
    setGenerated(null)

    try {
      const result = await generateRecoveryLinkFn({
        data: { targetUserId },
      })
      setGenerated({
        ...result,
        expiresAt: new Date(result.expiresAt),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukendt fejl')
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    const link = generated()
    if (!link) return
    await navigator.clipboard.writeText(recoveryUrl(link.token))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <PageShell size="sm">
      <div class="max-w-lg mx-auto">
        <Heading level="h1" class="mb-2">
          Konti-gendannelse
        </Heading>
        <Lead class="text-muted-foreground mb-8">
          Generer et éngangs-gendannelseslink til en coach, der er låst ude af
          sin konto. Lever linket manuelt (telefon eller din egen indbakke).
        </Lead>

        <section class="mb-10">
          <Heading level="h2" class="mb-4">
            Generer gendannelseslink
          </Heading>

          <form class="space-y-4" onSubmit={(e) => void handleGenerate(e)}>
            <div class="space-y-1">
              <label for="account" class="text-sm font-medium">
                Vælg konto
              </label>
              <select
                id="account"
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedUserId()}
                onInput={(e) => setSelectedUserId(e.currentTarget.value)}
                required
              >
                <option value="">— Vælg en konto —</option>
                <For each={loaderData().accounts}>
                  {(account) => (
                    <option value={account.id}>
                      {account.name} ({account.email})
                      {account.role === 'organizer' ? ' [arrangør]' : ''}
                    </option>
                  )}
                </For>
              </select>
            </div>

            <Button type="submit" disabled={busy() || !selectedUserId()}>
              Generer link (udløber om 24 timer)
            </Button>
          </form>

          <Show when={error()}>
            {(msg) => (
              <p class="mt-4 text-sm text-destructive" role="alert">
                {msg()}
              </p>
            )}
          </Show>
        </section>

        <Show when={generated()}>
          {(link) => (
            <section class="rounded-lg border border-border bg-muted/40 p-5 space-y-4">
              <div>
                <p class="text-sm font-medium mb-1">
                  Gendannelseslink til {link().targetName} ({link().targetEmail}
                  )
                </p>
                <p class="text-xs text-muted-foreground">
                  Udløber: {formatExpiry(link().expiresAt)} · Kan kun bruges én
                  gang
                </p>
              </div>

              <div class="flex items-center gap-2">
                <code class="flex-1 rounded bg-background border border-border px-3 py-2 text-xs break-all">
                  {recoveryUrl(link().token)}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void copyLink()}
                >
                  {copied() ? 'Kopieret!' : 'Kopiér'}
                </Button>
              </div>

              <p class="text-xs text-muted-foreground">
                Videresend dette link til coachen via telefon eller din egen
                e-mail. Linket er registreret i loggen.
              </p>
            </section>
          )}
        </Show>
      </div>
    </PageShell>
  )
}
