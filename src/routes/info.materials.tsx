import { Link, createFileRoute } from '@tanstack/solid-router'
import { ArrowLeft, Check, ExternalLink } from 'lucide-solid'
import { For } from 'solid-js'
import { cva } from '~/cva.config'
import { getInfoTopicByRoute } from '~/data/info-topics'

export const Route = createFileRoute('/info/materials')({
  component: MaterialsPage,
})

const kitCardVariants = cva({
  base: 'p-6 rounded-lg border',
  variants: {
    recommended: {
      true: 'bg-cyan-500/10 border-cyan-500/30',
      false: 'bg-slate-700/50 border-slate-600',
    },
  },
  defaultVariants: {
    recommended: false,
  },
})

function MaterialsPage() {
  const topic = getInfoTopicByRoute('/info/materials')

  const robotKits = [
    {
      name: 'LEGO SPIKE Prime',
      description:
        'Det nyeste LEGO Education robotsæt med kraftfuld hub og intuitivt programmeringsmiljø.',
      recommended: true,
    },
    {
      name: 'LEGO Mindstorms EV3',
      description:
        'Klassisk og velafprøvet robotsæt med stort community og mange ressourcer.',
      recommended: true,
    },
    {
      name: 'LEGO SPIKE Essential',
      description: 'Velegnet til yngre deltagere og mindre komplekse opgaver.',
      recommended: false,
    },
    {
      name: 'Andre godkendte systemer',
      description:
        "Se WRO's officielle liste for alle godkendte robotsystemer.",
      recommended: false,
    },
  ]

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

          <h2 class="text-2xl font-semibold text-white mb-6">
            Godkendte robotsæt
          </h2>

          <div class="grid gap-4 mb-8">
            <For each={robotKits}>
              {(kit) => (
                <div class={kitCardVariants({ recommended: kit.recommended })}>
                  <div class="flex items-start justify-between">
                    <div>
                      <h3 class="text-lg font-semibold text-white flex items-center gap-2">
                        {kit.name}
                        {kit.recommended && (
                          <span class="text-xs bg-cyan-500 text-white px-2 py-0.5 rounded-full">
                            Anbefalet
                          </span>
                        )}
                      </h3>
                      <p class="text-gray-400 mt-1">{kit.description}</p>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>

          <h2 class="text-2xl font-semibold text-white mb-6">
            Andet du skal bruge
          </h2>

          <div class="space-y-3 mb-8">
            <For
              each={[
                'Øvebane til træning (kan købes eller laves selv)',
                'Computer til programmering',
                'Ekstra LEGO-klodser til at bygge robotten',
                'Tid og tålmodighed til at øve!',
              ]}
            >
              {(item) => (
                <div class="flex items-center gap-3 text-gray-300">
                  <Check class="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              )}
            </For>
          </div>

          <div class="p-6 bg-slate-700/50 rounded-lg">
            <h3 class="text-lg font-semibold text-white mb-3">
              Officielle regler og materialer
            </h3>
            <p class="text-gray-400 mb-4">
              Find de komplette regler og liste over tilladte materialer på WROs
              officielle hjemmeside.
            </p>
            <a
              href="https://wro-association.org/competition/2025-season/"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <span>Se officielle regler</span>
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
