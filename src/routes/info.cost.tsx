import { createFileRoute } from '@tanstack/solid-router'
import { Check } from 'lucide-solid'
import { For } from 'solid-js'
import { BackLink, InfoPageLayout, PageHeader } from '~/components/layout'
import { ContentCard, TipBox } from '~/components/ui'
import { getInfoTopicByRoute } from '~/data/info-topics'

export const Route = createFileRoute('/info/cost')({ component: CostPage })

function CostPage() {
  const topic = getInfoTopicByRoute('/info/cost')

  return (
    <InfoPageLayout>
      <BackLink />
      <PageHeader icon={topic.icon} title={topic.title} />

      <ContentCard>
        <p class="text-lead text-foreground/70 mb-8">{topic.description}</p>

        <div class="divide-y divide-border mb-8">
          <div class="pb-8">
            <h3 class="font-sans text-h4 font-medium text-foreground mb-4">
              Gratis
            </h3>
            <ul class="space-y-3">
              <For
                each={[
                  'Tilmelding til konkurrencen',
                  'Deltagelse i den danske finale',
                  'Adgang til online ressourcer og vejledninger',
                  'Diplom til alle deltagere',
                ]}
              >
                {(item) => (
                  <li class="flex items-start gap-3 text-sm-copy text-foreground/70">
                    <Check class="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                )}
              </For>
            </ul>
          </div>

          <div class="pt-8">
            <h3 class="font-sans text-h4 font-medium text-foreground mb-4">
              Egne udgifter
            </h3>
            <div class="space-y-4">
              <div class="flex gap-6 text-sm-copy">
                <span class="text-muted-foreground tabular-nums min-w-[90px]">
                  ~500–800 kr
                </span>
                <span class="text-foreground/70">
                  Øvebane (kan også laves selv)
                </span>
              </div>
              <div class="flex gap-6 text-sm-copy">
                <span class="text-muted-foreground tabular-nums min-w-[90px]">
                  Varierer
                </span>
                <span class="text-foreground/70">
                  Robotsæt (hvis I ikke allerede har et)
                </span>
              </div>
              <div class="flex gap-6 text-sm-copy">
                <span class="text-muted-foreground tabular-nums min-w-[90px]">
                  Varierer
                </span>
                <span class="text-foreground/70">Transport til finalen</span>
              </div>
            </div>
          </div>
        </div>

        <TipBox title="Lån eller del materialer" class="mb-8">
          Mange skoler har allerede robotsæt I kan låne. Spørg jeres
          naturfagslærer eller IT-ansvarlige. I kan også gå sammen med andre
          hold om at dele en øvebane.
        </TipBox>

        <div class="border border-border rounded-lg p-6">
          <h3 class="font-sans text-h5 font-medium text-foreground mb-3">
            Søg om støtte
          </h3>
          <p class="text-sm-copy text-muted-foreground">
            Nogle fonde og organisationer støtter STEM-aktiviteter for unge.
            Kontakt jeres skole eller kommune for at høre om muligheder for
            økonomisk støtte.
          </p>
        </div>
      </ContentCard>
    </InfoPageLayout>
  )
}
