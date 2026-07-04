import { createFileRoute, useNavigate } from '@tanstack/solid-router'
import { Show, createMemo, createSignal } from 'solid-js'
import { z } from 'zod'
import { PageShell } from '~/components/layout'
import { Button, Heading, Lead } from '~/components/ui'
import { authClient } from '~/lib/auth-client'
import { validateRecoveryTokenFn } from '~/lib/recovery-functions'

const searchSchema = z.object({
  token: z.string().min(1),
})

export const Route = createFileRoute('/recover')({
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    const result = await validateRecoveryTokenFn({
      data: { token: search.token },
    })
    if (result.valid) {
      return {
        tokenStatus: 'valid' as const,
        token: search.token,
        targetName: result.targetName,
        targetEmail: result.targetEmail,
      }
    }
    return {
      tokenStatus: 'invalid' as const,
      reason: result.reason,
    }
  },
  component: RecoverPage,
})

const reasonMessages: Record<string, string> = {
  not_found: 'Gendannelseslinket er ugyldigt eller findes ikke.',
  already_used:
    'Gendannelseslinket er allerede brugt. Bed en arrangør om et nyt.',
  expired:
    'Gendannelseslinket er udløbet (gyldigt i 24 timer). Bed en arrangør om et nyt.',
}

function RecoverPage() {
  const context = Route.useRouteContext()
  const navigate = useNavigate()

  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  const validCtx = createMemo(() => {
    const ctx = context()
    return ctx.tokenStatus === 'valid' ? ctx : null
  })

  const invalidReason = createMemo(() => {
    const ctx = context()
    return ctx.tokenStatus === 'invalid' ? ctx.reason : null
  })

  async function handleEnroll() {
    const ctx = validCtx()
    if (!ctx) return

    setError(null)
    setBusy(true)

    await authClient.passkey.addPasskey({
      context: JSON.stringify({ type: 'recovery', token: ctx.token }),
      fetchOptions: {
        onError: (c) => {
          setBusy(false)
          setError(c.error.message)
        },
        onSuccess: async () => {
          setBusy(false)
          await navigate({ to: '/dashboard' })
        },
      },
    })
  }

  return (
    <PageShell size="sm">
      <div class="max-w-md mx-auto">
        <Heading level="h1" class="mb-2">
          Konti-gendannelse
        </Heading>

        <Show
          when={validCtx()}
          fallback={
            <div class="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
              <p class="text-sm font-medium text-destructive mb-1">
                Ugyldigt gendannelseslink
              </p>
              <p class="text-sm text-muted-foreground">
                {reasonMessages[invalidReason() ?? ''] ?? 'Linket er ugyldigt.'}
              </p>
            </div>
          }
        >
          {(ctx) => (
            <div class="space-y-6">
              <Lead class="text-muted-foreground">
                Tilføj en ny adgangsnøgle til kontoen{' '}
                <strong>{ctx().targetName}</strong> ({ctx().targetEmail}).
              </Lead>

              <p class="text-sm text-muted-foreground">
                Du vil blive bedt om at bekræfte med din enheds biometri eller
                PIN. Linket er éngangs-brug og udløber automatisk.
              </p>

              <Button
                type="button"
                class="w-full"
                disabled={busy()}
                onClick={() => void handleEnroll()}
              >
                Tilføj adgangsnøgle
              </Button>

              <Show when={error()}>
                {(msg) => (
                  <p class="text-sm text-destructive" role="alert">
                    {msg()}
                  </p>
                )}
              </Show>
            </div>
          )}
        </Show>
      </div>
    </PageShell>
  )
}
