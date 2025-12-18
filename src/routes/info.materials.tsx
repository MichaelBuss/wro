import { createFileRoute } from '@tanstack/solid-router'
import { Check, ExternalLink } from 'lucide-solid'
import { For } from 'solid-js'
import { BackLink, InfoPageLayout, PageHeader } from '~/components/layout'
import { ContentCard } from '~/components/ui'
import { cva } from '~/cva.config'
import { getInfoTopicByRoute } from '~/data/info-topics'

export const Route = createFileRoute('/info/materials')({
  component: MaterialsPage,
})

const kitCardVariants = cva({
  base: 'p-6 rounded-lg border',
  variants: {
    recommended: {
      true: 'bg-wro-blue-50 border-wro-blue-200',
      false: 'bg-gray-50 border-gray-200',
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
    <InfoPageLayout>
      <BackLink />
      <PageHeader icon={topic.icon} title={topic.title} />

      <ContentCard>
        <p class="text-xl text-slate-600 mb-8">{topic.description}</p>

        <h2 class="text-2xl font-semibold text-slate-800 mb-6">
          Godkendte robotsæt
        </h2>

        <div class="grid gap-4 mb-8">
          <For each={robotKits}>
            {(kit) => (
              <div class={kitCardVariants({ recommended: kit.recommended })}>
                <div class="flex items-start justify-between">
                  <div>
                    <h3 class="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      {kit.name}
                      {kit.recommended && (
                        <span class="text-xs bg-wro-blue-600 text-white px-2 py-0.5 rounded-full">
                          Anbefalet
                        </span>
                      )}
                    </h3>
                    <p class="text-slate-500 mt-1">{kit.description}</p>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>

        <h2 class="text-2xl font-semibold text-slate-800 mb-6">
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
              <div class="flex items-center gap-3 text-slate-600">
                <Check class="w-5 h-5 text-green-600 shrink-0" />
                <span>{item}</span>
              </div>
            )}
          </For>
        </div>

        <div class="p-6 bg-gray-50 rounded-lg">
          <h3 class="text-lg font-semibold text-slate-800 mb-3">
            Officielle regler og materialer
          </h3>
          <p class="text-slate-500 mb-4">
            Find de komplette regler og liste over tilladte materialer på WROs
            officielle hjemmeside.
          </p>
          <a
            href="https://wro-association.org/competition/2025-season/"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 text-wro-blue-600 hover:text-wro-blue-500 transition-colors"
          >
            <span>Se officielle regler</span>
            <ExternalLink size={16} />
          </a>
        </div>
      </ContentCard>
    </InfoPageLayout>
  )
}
