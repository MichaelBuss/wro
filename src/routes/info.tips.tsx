import { createFileRoute } from '@tanstack/solid-router'
import { createServerFn } from '@tanstack/solid-start'
import { For } from 'solid-js'
import { InfoPageLayout } from '~/components/layout'
import { ContentCard } from '~/components/ui'
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
        <div class="divide-y divide-border">
          <For each={data().quotes}>
            {(tip) => (
              <blockquote class="py-6 first:pt-0 last:pb-0">
                <p class="font-serif text-h5 font-normal text-foreground/80 italic mb-3">
                  "{tip.quote}"
                </p>
                <footer class="text-caption text-muted-foreground">
                  <span class="font-sans not-italic font-medium text-foreground/70">
                    {tip.author}
                  </span>
                  <span class="ml-2">— {tip.team}</span>
                </footer>
              </blockquote>
            )}
          </For>
        </div>
      </ContentCard>

      <ContentCard>
        <h2 class="font-sans text-h3 font-semibold text-foreground mb-6">
          Praktiske tips
        </h2>
        <div class="divide-y divide-border">
          <For each={data().practicalTips}>
            {(tip, index) => (
              <div class="flex gap-5 py-5 first:pt-0 last:pb-0">
                <span class="font-serif text-h4 text-muted-foreground/40 tabular-nums shrink-0 w-6 text-right">
                  {index() + 1}
                </span>
                <div>
                  <h3 class="font-sans text-sm-copy font-medium text-foreground mb-1">
                    {tip.title}
                  </h3>
                  <p class="text-sm-copy text-muted-foreground">
                    {tip.description}
                  </p>
                </div>
              </div>
            )}
          </For>
        </div>
      </ContentCard>
    </InfoPageLayout>
  )
}
