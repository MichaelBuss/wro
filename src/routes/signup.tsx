import { createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/signup')({ component: SignupPage })

function SignupPage() {
  return (
    <div class="min-h-screen bg-wro-blue-950 py-16 px-6">
      <div class="max-w-2xl mx-auto text-center">
        <h1 class="text-4xl md:text-5xl font-bold text-white mb-6">
          Tilmelding kommer snart
        </h1>
        <p class="text-xl text-white/70 mb-8">
          Vi arbejder på tilmeldingssiden. Hold øje med denne side for
          opdateringer!
        </p>
        <div class="inline-flex items-center gap-2 px-6 py-3 bg-white/5 rounded-lg border border-white/10">
          <span class="text-white/60">🚧</span>
          <span class="text-white/80">Under konstruktion</span>
        </div>
      </div>
    </div>
  )
}

