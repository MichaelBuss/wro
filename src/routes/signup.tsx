import { createFileRoute } from '@tanstack/solid-router'
import { Heading, Lead } from '~/components/ui'

export const Route = createFileRoute('/signup')({ component: SignupPage })

function SignupPage() {
  return (
    <div class="min-h-screen bg-background py-16 px-6">
      <div class="max-w-2xl mx-auto text-center">
        <Heading level="h1" class="mb-6">
          Tilmelding kommer snart
        </Heading>
        <Lead class="text-muted-foreground mb-8">
          Vi arbejder på tilmeldingssiden. Hold øje med denne side for
          opdateringer!
        </Lead>
        <div class="inline-flex items-center gap-2 px-6 py-3 bg-card rounded-lg border border-border shadow-sm">
          <span class="text-muted-foreground">🚧</span>
          <span class="text-muted-foreground">Under konstruktion</span>
        </div>
      </div>
    </div>
  )
}
