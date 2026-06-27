import { createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/signup')({ component: SignupPage })

function SignupPage() {
  return (
    <div class="min-h-screen bg-background py-16 px-6">
      <div class="max-w-2xl mx-auto text-center">
        <h1 class="text-4xl md:text-5xl font-bold text-foreground mb-6">
          Tilmelding kommer snart
        </h1>
        <p class="text-xl text-muted-foreground mb-8">
          Vi arbejder på tilmeldingssiden. Hold øje med denne side for
          opdateringer!
        </p>
        <div class="inline-flex items-center gap-2 px-6 py-3 bg-card rounded-lg border border-border shadow-sm">
          <span class="text-muted-foreground">🚧</span>
          <span class="text-muted-foreground">Under konstruktion</span>
        </div>
      </div>
    </div>
  )
}
