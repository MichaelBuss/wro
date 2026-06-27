import { createFileRoute } from '@tanstack/solid-router'
import { Check, ExternalLink } from 'lucide-solid'
import { For } from 'solid-js'
import { BackLink, InfoPageLayout, PageHeader } from '~/components/layout'
import { ContentCard } from '~/components/ui'
import { getInfoTopicByRoute } from '~/data/info-topics'

export const Route = createFileRoute('/info/materials')({
  component: MaterialsPage,
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
        <p class="text-lead text-foreground/70 mb-8">{topic.description}</p>

        <h2 class="font-sans text-h3 font-semibold text-foreground mb-6">
          Godkendte robotsæt
        </h2>

        <div class="divide-y divide-border mb-8">
          <For each={robotKits}>
            {(kit) => (
              <div class="py-5 first:pt-0 last:pb-0">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <h3 class="font-sans text-sm-copy font-medium text-foreground flex items-center gap-2 mb-1">
                      {kit.name}
                      {kit.recommended && (
                        <span class="text-caption font-normal text-primary border border-primary/30 px-1.5 py-0.5 rounded">
                          Anbefalet
                        </span>
                      )}
                    </h3>
                    <p class="text-caption text-muted-foreground">
                      {kit.description}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>

        <h2 class="font-sans text-h3 font-semibold text-foreground mb-6">
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
              <div class="flex items-center gap-3 text-sm-copy text-foreground/70">
                <Check class="w-4 h-4 text-primary shrink-0" />
                <span>{item}</span>
              </div>
            )}
          </For>
        </div>

        <div class="border border-border rounded-lg p-6">
          <h3 class="font-sans text-h5 font-medium text-foreground mb-3">
            Officielle regler og materialer
          </h3>
          <p class="text-sm-copy text-muted-foreground mb-4">
            Find de komplette regler og liste over tilladte materialer på WROs
            officielle hjemmeside.
          </p>
          <a
            href="https://wro-association.org/competition/2025-season/"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 text-sm-copy text-primary hover:underline underline-offset-4 transition-colors"
          >
            <span>Se officielle regler</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </ContentCard>
    </InfoPageLayout>
  )
}
