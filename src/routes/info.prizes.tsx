import { createFileRoute } from '@tanstack/solid-router'
import { BackLink, InfoPageLayout, PageHeader } from '~/components/layout'
import { ContentCard, TipBox } from '~/components/ui'
import { CONSTANTS } from '~/data/constants'
import { getInfoTopicByRoute } from '~/data/info-topics'

export const Route = createFileRoute('/info/prizes')({ component: PrizesPage })

function PrizesPage() {
  const topic = getInfoTopicByRoute('/info/prizes')

  return (
    <InfoPageLayout>
      <BackLink />
      <PageHeader icon={topic.icon} title={topic.title} />

      <ContentCard>
        <div class="prose prose-invert max-w-none">
          <p class="text-xl text-gray-300 mb-6">{topic.description}</p>

          <h2 class="text-2xl font-semibold text-white mb-4">
            Præmier ved WRO Danmark
          </h2>

          <div class="space-y-6">
            <div class="bg-linear-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-lg p-6">
              <h3 class="text-xl font-bold text-yellow-400 mb-2">
                🥇 1. plads - Hovedpræmien
              </h3>
              <p class="text-gray-300">
                Fuldtbetalt rejse til WRO-verdensfinalen i{' '}
                {CONSTANTS.WORLD_FINAL_LOCATION}! Dette inkluderer fly,
                overnatning og deltagelse i verdensfinalen.
              </p>
            </div>

            <div class="bg-linear-to-r from-gray-400/20 to-slate-500/20 border border-gray-400/30 rounded-lg p-6">
              <h3 class="text-xl font-bold text-gray-300 mb-2">🥈 2. plads</h3>
              <p class="text-gray-300">
                Spændende præmier og anerkendelse for jeres fantastiske indsats.
              </p>
            </div>

            <div class="bg-linear-to-r from-orange-600/20 to-amber-700/20 border border-orange-500/30 rounded-lg p-6">
              <h3 class="text-xl font-bold text-orange-400 mb-2">
                🥉 3. plads
              </h3>
              <p class="text-gray-300">
                Præmier og diplom for jeres flotte præstation.
              </p>
            </div>
          </div>

          <TipBox title="💡 Vidste du?" class="mt-8">
            Alle deltagere får et diplom og mulighed for at netværke med andre
            robotentusiaster fra hele Danmark!
          </TipBox>
        </div>
      </ContentCard>
    </InfoPageLayout>
  )
}
