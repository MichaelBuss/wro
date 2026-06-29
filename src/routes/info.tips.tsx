import { createFileRoute } from '@tanstack/solid-router'
import { createServerFn } from '@tanstack/solid-start'
import { InfoPageLayout } from '~/components/layout'
import { ContentCard, QuoteList, TipsList } from '~/components/ui'
import { getInfoTopicByRoute } from '~/data/info-topics'
import { getCollectionItems } from '~/server/content'

const getTipsData = createServerFn({ method: 'GET' }).handler(() => ({
  quotes: getCollectionItems('quotes').sort((a, b) => a.order - b.order),
  practicalTips: getCollectionItems('practical-tips').sort(
    (a, b) => a.order - b.order,
  ),
}))

export const Route = createFileRoute('/info/tips')({
  component: TipsPage,
  loader: () => getTipsData(),
})

function TipsPage() {
  const topic = getInfoTopicByRoute('/info/tips')
  const data = Route.useLoaderData()

  return (
    <InfoPageLayout icon={topic.icon} title={topic.title}>

      <ContentCard class="mb-8">
        <h2 class="font-sans text-h3 font-semibold text-foreground mb-6">
          Hvad siger tidligere deltagere?
        </h2>
        <QuoteList quotes={data().quotes} />
      </ContentCard>

      <ContentCard>
        <h2 class="font-sans text-h3 font-semibold text-foreground mb-6">
          Praktiske tips
        </h2>
        <TipsList tips={data().practicalTips} />
      </ContentCard>
    </InfoPageLayout>
  )
}
