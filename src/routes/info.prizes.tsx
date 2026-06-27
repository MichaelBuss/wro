import { createFileRoute } from '@tanstack/solid-router'
import { createServerFn } from '@tanstack/solid-start'
import { BackLink, InfoPageLayout, PageHeader } from '~/components/layout'
import { ContentCard, TipBox } from '~/components/ui'
import { getInfoTopicByRoute } from '~/data/info-topics'
import { getPageContent } from '~/server/content'

const getEventInfo = createServerFn({ method: 'GET' }).handler(() =>
  getPageContent('event-info'),
)

export const Route = createFileRoute('/info/prizes')({
  component: PrizesPage,
  loader: () => getEventInfo(),
})

function PrizesPage() {
  const topic = getInfoTopicByRoute('/info/prizes')
  const eventInfo = Route.useLoaderData()

  return (
    <InfoPageLayout>
      <BackLink />
      <PageHeader icon={topic.icon} title={topic.title} />

      <ContentCard>
        <div class="prose max-w-none">
          <p class="text-xl text-slate-600 mb-6">{topic.description}</p>

          <h2 class="text-2xl font-semibold text-slate-800 mb-4">
            Præmier ved WRO Danmark
          </h2>

          <div class="space-y-6">
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 class="text-xl font-bold text-yellow-700 mb-2">
                🥇 1. plads - Hovedpræmien
              </h3>
              <p class="text-slate-600">
                Fuldtbetalt rejse til WRO-verdensfinalen i{' '}
                {eventInfo().world_final_location}! Dette inkluderer fly,
                overnatning og deltagelse i verdensfinalen.
              </p>
            </div>

            <div class="bg-gray-100 border border-gray-200 rounded-lg p-6">
              <h3 class="text-xl font-bold text-slate-600 mb-2">🥈 2. plads</h3>
              <p class="text-slate-600">
                Spændende præmier og anerkendelse for jeres fantastiske indsats.
              </p>
            </div>

            <div class="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <h3 class="text-xl font-bold text-orange-700 mb-2">
                🥉 3. plads
              </h3>
              <p class="text-slate-600">
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
