import { createFileRoute } from '@tanstack/solid-router'
import { PageShell } from '~/components/layout'
import { Heading, Lead } from '~/components/ui'

export const Route = createFileRoute('/signup')({ component: SignupPage })

function SignupPage() {
  return (
    <PageShell size="sm">
      <div class="py-16 text-center">
        <Heading level="h1" class="mb-6">
          Tilmelding kommer snart
        </Heading>
        <Lead class="text-muted-foreground mb-8">
          Vi arbejder på tilmeldingssiden. Hold øje med denne side for
          opdateringer!
        </Lead>
        <div class="inline-flex items-center gap-2 px-6 py-3 bg-card rounded-lg border border-border shadow-sm">
          <span aria-hidden="true">🚧</span>
          <span class="text-muted-foreground">Under konstruktion</span>
        </div>
      </div>
    </PageShell>
  )
}
