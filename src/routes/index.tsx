import { createFileRoute } from '@tanstack/solid-router'
import { For } from 'solid-js'
import { InfoTopicCard } from '~/components/InfoTopicCard'
import { INFO_TOPICS } from '~/lib/info-topics'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <div class="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <section class="relative py-20 px-6 text-center overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10"></div>
        <div class="relative max-w-5xl mx-auto">
          <h1 class="text-6xl md:text-7xl font-black text-white [letter-spacing:-0.04em]">
            <span class="text-gray-300">WRO</span>{' '}
            <span class="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              DANMARK
            </span>
          </h1>

          <p class="text-2xl md:text-3xl text-gray-300 mb-4 font-light">
            World Robot Olympiad
          </p>
          <p class="text-lg text-gray-400 max-w-3xl mx-auto mb-8">
            Deltag i Danmarks største robotkonkurrence for unge. Byg, programmér
            og konkurrér med din robot – og vind en rejse til verdensfinalen!
          </p>
          <div class="flex flex-col items-center gap-4">
            <a
              href="https://wro.dk"
              target="_blank"
              rel="noopener noreferrer"
              class="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-cyan-500/50"
            >
              Tilmeld dig nu
            </a>
            <p class="text-gray-400 text-sm mt-2">
              Læs mere nedenfor om hvordan du deltager
            </p>
          </div>
        </div>
      </section>

      <section class="py-16 px-6 max-w-7xl mx-auto">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <For each={INFO_TOPICS}>
            {(topic) => <InfoTopicCard topic={topic} />}
          </For>
        </div>
      </section>
    </div>
  )
}
