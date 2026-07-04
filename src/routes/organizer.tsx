import { Link, createFileRoute, redirect } from '@tanstack/solid-router'
import { PageShell } from '~/components/layout'
import { Button, Heading, Lead } from '~/components/ui'
import { authClient } from '~/lib/auth-client'
import { decideOrganizerAccess, getSessionWithRole } from '~/lib/auth-functions'

export const Route = createFileRoute('/organizer')({
  beforeLoad: async () => {
    const session = await getSessionWithRole()
    const access = decideOrganizerAccess(session?.user)

    if (access.type === 'redirect') {
      throw redirect({ to: access.to })
    }

    return { user: access.user }
  },
  component: OrganizerLanding,
})

function OrganizerLanding() {
  const context = Route.useRouteContext()
  const navigate = Route.useNavigate()

  async function signOut() {
    await authClient.signOut()
    await navigate({ to: '/login' })
  }

  return (
    <PageShell size="sm">
      <div class="max-w-lg mx-auto">
        <Heading level="h1" class="mb-2">
          Arrangør-panel
        </Heading>
        <Lead class="text-muted-foreground mb-8">
          Logget ind som {context().user.email}.
        </Lead>

        <section class="mb-10 space-y-3">
          <Heading level="h2" class="mb-4">
            Navigation
          </Heading>

          <div class="rounded-lg border border-border px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p class="font-medium">Tilmeldinger</p>
              <p class="text-sm text-muted-foreground">
                Gennemse og bekræft holdtilmeldinger
              </p>
            </div>
            <Link
              to="/organizer/registrations"
              class="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              Åbn
            </Link>
          </div>

          <div class="rounded-lg border border-border px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p class="font-medium">Indholdsredaktion (Sveltia CMS)</p>
              <p class="text-sm text-muted-foreground">
                Redigér sideindhold via GitHub-login
              </p>
            </div>
            <a
              href="/admin"
              class="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Åbn CMS ↗
            </a>
          </div>
        </section>

        <Button type="button" variant="outline" onClick={() => void signOut()}>
          Log ud
        </Button>
      </div>
    </PageShell>
  )
}
