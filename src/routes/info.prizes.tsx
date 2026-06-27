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
        <p class="text-lead text-foreground/70 mb-8">{topic.description}</p>

        <h2 class="font-sans text-h3 font-semibold text-foreground mb-6">
          Præmier ved WRO Danmark
        </h2>

        <div class="divide-y divide-border">
          <div class="py-6">
            <p class="text-caption text-muted-foreground uppercase tracking-wider mb-2">
              1. plads — Hovedpræmien
            </p>
            <p class="text-h5 font-medium text-foreground mb-2">
              Fuldtbetalt rejse til verdensfinalen
            </p>
            <p class="text-sm-copy text-foreground/70">
              Fuldtbetalt rejse til WRO-verdensfinalen i{' '}
              {eventInfo().world_final_location}. Inkluderer fly, overnatning og
              deltagelse.
            </p>
          </div>

          <div class="py-6">
            <p class="text-caption text-muted-foreground uppercase tracking-wider mb-2">
              2. plads
            </p>
            <p class="text-h5 font-medium text-foreground mb-2">
              Spændende præmier
            </p>
            <p class="text-sm-copy text-foreground/70">
              Anerkendelse og præmier for en fantastisk indsats.
            </p>
          </div>

          <div class="py-6">
            <p class="text-caption text-muted-foreground uppercase tracking-wider mb-2">
              3. plads
            </p>
            <p class="text-h5 font-medium text-foreground mb-2">
              Præmier og diplom
            </p>
            <p class="text-sm-copy text-foreground/70">
              Præmier og diplom for en flot præstation.
            </p>
          </div>
        </div>

        <TipBox title="Vidste du?" class="mt-8">
          Alle deltagere får et diplom og mulighed for at netværke med andre
          robotentusiaster fra hele Danmark!
        </TipBox>
      </ContentCard>
    </InfoPageLayout>
  )
}
