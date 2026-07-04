import { createFileRoute, redirect } from '@tanstack/solid-router'
import { PageShell } from '~/components/layout'
import { Button, Heading, Lead } from '~/components/ui'
import { authClient } from '~/lib/auth-client'
import { getSession } from '~/lib/auth-functions'
import { decideDashboardAccess } from '~/lib/dashboard-access'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const session = await getSession()
    const access = decideDashboardAccess(session)

    if (access.type === 'redirect') {
      throw redirect({ to: access.to })
    }

    return { user: access.user }
  },
  component: Dashboard,
})

function Dashboard() {
  const context = Route.useRouteContext()
  const navigate = Route.useNavigate()

  async function signOut() {
    await authClient.signOut()
    await navigate({ to: '/login' })
  }

  return (
    <PageShell size="sm">
      <div class="max-w-md mx-auto">
        <Heading level="h1" class="mb-2">
          Hej, {context().user.name}
        </Heading>
        <Lead class="text-muted-foreground mb-8">
          Du er logget ind som {context().user.email}.
        </Lead>
        <Button type="button" variant="outline" onClick={() => void signOut()}>
          Log ud
        </Button>
      </div>
    </PageShell>
  )
}
