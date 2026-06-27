import { createFileRoute } from '@tanstack/solid-router'
import { Check } from 'lucide-solid'
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
        <p class="text-xl text-muted-foreground mb-8">{topic.description}</p>

        <div class="grid md:grid-cols-2 gap-6 mb-8">
          <div class="p-6 bg-green-50 border border-green-200 rounded-lg">
            <h3 class="text-xl font-semibold text-green-700 mb-4 flex items-center gap-2">
              <Check class="w-6 h-6" />
              Gratis
            </h3>
            <ul class="space-y-3 text-foreground/80">
              <li class="flex items-start gap-2">
                <Check class="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <span>Tilmelding til konkurrencen</span>
              </li>
              <li class="flex items-start gap-2">
                <Check class="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <span>Deltagelse i den danske finale</span>
              </li>
              <li class="flex items-start gap-2">
                <Check class="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <span>Adgang til online ressourcer og vejledninger</span>
              </li>
              <li class="flex items-start gap-2">
                <Check class="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <span>Diplom til alle deltagere</span>
              </li>
            </ul>
          </div>

          <div class="p-6 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 class="text-xl font-semibold text-amber-700 mb-4 flex items-center gap-2">
              💰 Egne udgifter
            </h3>
            <ul class="space-y-3 text-foreground/80">
              <li class="flex items-start gap-2">
                <span class="text-amber-600 font-bold min-w-[100px]">
                  ~500-800 kr
                </span>
                <span>Øvebane (kan også laves selv)</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-amber-600 font-bold min-w-[100px]">
                  Varierer
                </span>
                <span>Robotsæt (hvis I ikke allerede har et)</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-amber-600 font-bold min-w-[100px]">
                  Varierer
                </span>
                <span>Transport til finalen</span>
              </li>
            </ul>
          </div>
        </div>

        <TipBox title="💡 Tip: Lån eller del materialer" class="mb-8">
          Mange skoler har allerede robotsæt I kan låne. Spørg jeres
          naturfagslærer eller IT-ansvarlige. I kan også gå sammen med andre
          hold om at dele en øvebane.
        </TipBox>

        <div class="p-6 bg-muted rounded-lg">
          <h3 class="text-lg font-semibold text-foreground mb-3">
            Søg om støtte
          </h3>
          <p class="text-muted-foreground">
            Nogle fonde og organisationer støtter STEM-aktiviteter for unge.
            Kontakt jeres skole eller kommune for at høre om muligheder for
            økonomisk støtte.
          </p>
        </div>
      </ContentCard>
    </InfoPageLayout>
  )
}
