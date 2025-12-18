import { Link, createFileRoute } from '@tanstack/solid-router'
import { ArrowLeft, Check } from 'lucide-solid'
import { getInfoTopicByRoute } from '~/data/info-topics'

export const Route = createFileRoute('/info/cost')({ component: CostPage })

function CostPage() {
  const topic = getInfoTopicByRoute('/info/cost')

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
          <topic.icon class="w-10 h-10 text-cyan-400" />
          <h1 class="text-4xl md:text-5xl font-bold text-white">
            <span class="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {topic.title}
            </span>
          </h1>
        </div>

        <div class="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8">
          <p class="text-xl text-gray-300 mb-8">{topic.description}</p>

          <div class="grid md:grid-cols-2 gap-6 mb-8">
            <div class="p-6 bg-green-500/10 border border-green-500/30 rounded-lg">
              <h3 class="text-xl font-semibold text-green-400 mb-4 flex items-center gap-2">
                <Check class="w-6 h-6" />
                Gratis
              </h3>
              <ul class="space-y-3 text-gray-300">
                <li class="flex items-start gap-2">
                  <Check class="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Tilmelding til konkurrencen</span>
                </li>
                <li class="flex items-start gap-2">
                  <Check class="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Deltagelse i den danske finale</span>
                </li>
                <li class="flex items-start gap-2">
                  <Check class="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Adgang til online ressourcer og vejledninger</span>
                </li>
                <li class="flex items-start gap-2">
                  <Check class="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Diplom til alle deltagere</span>
                </li>
              </ul>
            </div>

            <div class="p-6 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <h3 class="text-xl font-semibold text-amber-400 mb-4 flex items-center gap-2">
                💰 Egne udgifter
              </h3>
              <ul class="space-y-3 text-gray-300">
                <li class="flex items-start gap-2">
                  <span class="text-amber-400 font-bold min-w-[100px]">
                    ~500-800 kr
                  </span>
                  <span>Øvebane (kan også laves selv)</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-amber-400 font-bold min-w-[100px]">
                    Varierer
                  </span>
                  <span>Robotsæt (hvis I ikke allerede har et)</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-amber-400 font-bold min-w-[100px]">
                    Varierer
                  </span>
                  <span>Transport til finalen</span>
                </li>
              </ul>
            </div>
          </div>

          <div class="p-6 bg-cyan-500/10 border border-cyan-500/30 rounded-lg mb-8">
            <h3 class="text-lg font-semibold text-cyan-400 mb-3">
              💡 Tip: Lån eller del materialer
            </h3>
            <p class="text-gray-300">
              Mange skoler har allerede robotsæt I kan låne. Spørg jeres
              naturfagslærer eller IT-ansvarlige. I kan også gå sammen med andre
              hold om at dele en øvebane.
            </p>
          </div>

          <div class="p-6 bg-slate-700/50 rounded-lg">
            <h3 class="text-lg font-semibold text-white mb-3">Søg om støtte</h3>
            <p class="text-gray-400">
              Nogle fonde og organisationer støtter STEM-aktiviteter for unge.
              Kontakt jeres skole eller kommune for at høre om muligheder for
              økonomisk støtte.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
