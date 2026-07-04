import { createFileRoute, redirect, useNavigate } from '@tanstack/solid-router'
import { Show, createSignal } from 'solid-js'
import { PageShell } from '~/components/layout'
import { Button, Heading, Lead } from '~/components/ui'
import { authClient } from '~/lib/auth-client'
import { getSession } from '~/lib/auth-functions'
import { decideLoginAccess } from '~/lib/login-access'
import { usePasskeyAutofill } from '~/lib/use-passkey-autofill'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const session = await getSession()
    const access = decideLoginAccess(session)
    if (access.type === 'redirect') {
      throw redirect({ to: access.to })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [name, setName] = createSignal('')
  const [email, setEmail] = createSignal('')
  const [error, setError] = createSignal<string | null>(null)
  const [busy, setBusy] = createSignal(false)

  async function register(event: Event) {
    event.preventDefault()
    setError(null)
    setBusy(true)

    await authClient.passkey.addPasskey({
      name: name(),
      context: JSON.stringify({ type: 'signup', email: email(), name: name() }),
      fetchOptions: {
        onError: (context) => {
          setBusy(false)
          setError(context.error.message)
        },
        onSuccess: async () => {
          setBusy(false)
          await navigate({ to: '/dashboard' })
        },
      },
    })
  }

  async function signIn() {
    setError(null)
    setBusy(true)

    await authClient.signIn.passkey({
      fetchOptions: {
        onError: (context) => {
          setBusy(false)
          setError(context.error.message)
        },
        onSuccess: async () => {
          setBusy(false)
          await navigate({ to: '/dashboard' })
        },
      },
    })
  }

  usePasskeyAutofill({
    onSuccess: async () => {
      setBusy(false)
      await navigate({ to: '/dashboard' })
    },
    onError: setError,
  })

  return (
    <PageShell size="sm">
      <div class="max-w-md mx-auto">
        <Heading level="h1" class="mb-2">
          Log ind
        </Heading>
        <Lead class="text-muted-foreground mb-8">
          WRO Denmark bruger adgangsnøgler (passkeys) — ingen adgangskode, ingen
          email.
        </Lead>

        <form onSubmit={register} class="space-y-4">
          <div class="space-y-1">
            <label for="name" class="text-sm font-medium">
              Navn
            </label>
            <input
              id="name"
              type="text"
              required
              autocomplete="name"
              value={name()}
              onInput={(event) => setName(event.currentTarget.value)}
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div class="space-y-1">
            <label for="email" class="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autocomplete="email webauthn"
              value={email()}
              onInput={(event) => setEmail(event.currentTarget.value)}
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <Button type="submit" class="w-full" disabled={busy()}>
            Opret konto med adgangsnøgle
          </Button>
        </form>

        <div class="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span class="h-px flex-1 bg-border" />
          <span>eller</span>
          <span class="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          class="w-full"
          disabled={busy()}
          onClick={() => void signIn()}
        >
          Log ind med adgangsnøgle
        </Button>

        <Show when={error()}>
          {(message) => (
            <p class="mt-4 text-sm text-destructive" role="alert">
              {message()}
            </p>
          )}
        </Show>
      </div>
    </PageShell>
  )
}
