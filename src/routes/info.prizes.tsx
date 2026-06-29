import { createFileRoute } from '@tanstack/solid-router'
import { createServerFn } from '@tanstack/solid-start'
import { For, Show, createMemo } from 'solid-js'
import { BackLink, InfoPageLayout, PageHeader } from '~/components/layout'
import { ContentCard, TipBox } from '~/components/ui'
import { getInfoTopicByRoute } from '~/data/info-topics'
import { getPageContent } from '~/server/content'

const getPrizesData = createServerFn({ method: 'GET' }).handler(() => ({
  prizes: getPageContent('prizes'),
  eventInfo: getPageContent('event-info'),
}))

export const Route = createFileRoute('/info/prizes')({
  component: PrizesPage,
  loader: () => getPrizesData(),
})

function PrizesPage() {
  const topic = getInfoTopicByRoute('/info/prizes')
  const data = Route.useLoaderData()

  const firstPrize = createMemo(() => data().prizes.prizes[0])
  const restPrizes = createMemo(() => data().prizes.prizes.slice(1))

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
          <Show when={firstPrize()}>
            {(prize) => (
              <div class="py-6">
                <p class="text-caption text-muted-foreground uppercase tracking-wider mb-2">
                  {prize().label}
                </p>
                <p class="text-h5 font-medium text-foreground mb-2">
                  {prize().title}
                </p>
                <p class="text-sm-copy text-foreground/70">
                  {prize().description} I{' '}
                  {data().eventInfo.world_final_location}.
                </p>
              </div>
            )}
          </Show>

          <For each={restPrizes()}>
            {(prize) => (
              <div class="py-6">
                <p class="text-caption text-muted-foreground uppercase tracking-wider mb-2">
                  {prize.label}
                </p>
                <p class="text-h5 font-medium text-foreground mb-2">
                  {prize.title}
                </p>
                <p class="text-sm-copy text-foreground/70">
                  {prize.description}
                </p>
              </div>
            )}
          </For>
        </div>

        <TipBox title={data().prizes.tip_heading} class="mt-8">
          {data().prizes.tip_body}
        </TipBox>
      </ContentCard>
    </InfoPageLayout>
  )
}
