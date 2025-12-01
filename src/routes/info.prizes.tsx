import { createFileRoute, Link } from '@tanstack/solid-router'
import { ArrowLeft } from 'lucide-solid'
import { CONSTANTS } from '~/lib/constants'
import { getInfoTopicByRoute } from '~/lib/info-topics'

export const Route = createFileRoute('/info/prizes')({ component: PrizesPage })

function PrizesPage() {
  const topic = getInfoTopicByRoute('/info/prizes')

  return (
    <div class="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <section class="py-16 px-6 max-w-4xl mx-auto">
        <Link
          to="/"
          class="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors mb-8"
        >
          <ArrowLeft size={20} />
          <span>Tilbage til forsiden</span>
        </Link>

        <div class="flex items-center gap-4 mb-8">
          {topic.icon}
          <h1 class="text-4xl md:text-5xl font-bold text-white">
            <span class="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {topic.title}
            </span>
          </h1>
        </div>

        <div class="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8">
          <div class="prose prose-invert max-w-none">
            <p class="text-xl text-gray-300 mb-6">{topic.description}</p>

            <h2 class="text-2xl font-semibold text-white mb-4">
              Præmier ved WRO Danmark
            </h2>

            <div class="space-y-6">
              <div class="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-lg p-6">
                <h3 class="text-xl font-bold text-yellow-400 mb-2">
                  🥇 1. plads - Hovedpræmien
                </h3>
                <p class="text-gray-300">
                  Fuldtbetalt rejse til WRO-verdensfinalen i{' '}
                  {CONSTANTS.WORLD_FINAL_LOCATION}! Dette inkluderer fly,
                  overnatning og deltagelse i verdensfinalen.
                </p>
              </div>

              <div class="bg-gradient-to-r from-gray-400/20 to-slate-500/20 border border-gray-400/30 rounded-lg p-6">
                <h3 class="text-xl font-bold text-gray-300 mb-2">
                  🥈 2. plads
                </h3>
                <p class="text-gray-300">
                  Spændende præmier og anerkendelse for jeres fantastiske
                  indsats.
                </p>
              </div>

              <div class="bg-gradient-to-r from-orange-600/20 to-amber-700/20 border border-orange-500/30 rounded-lg p-6">
                <h3 class="text-xl font-bold text-orange-400 mb-2">
                  🥉 3. plads
                </h3>
                <p class="text-gray-300">
                  Præmier og diplom for jeres flotte præstation.
                </p>
              </div>
            </div>

            <div class="mt-8 p-6 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <h3 class="text-lg font-semibold text-cyan-400 mb-2">
                💡 Vidste du?
              </h3>
              <p class="text-gray-300">
                Alle deltagere får et diplom og mulighed for at netværke med
                andre robotentusiaster fra hele Danmark!
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

