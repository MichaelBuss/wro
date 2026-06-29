import { createFileRoute } from '@tanstack/solid-router'
import { createServerFn } from '@tanstack/solid-start'
import { Check } from 'lucide-solid'
import { For } from 'solid-js'
import { BackLink, InfoPageLayout, PageHeader } from '~/components/layout'
import { ContentCard, TipBox } from '~/components/ui'
import { getInfoTopicByRoute } from '~/data/info-topics'
import { getPageContent } from '~/server/content'

const getCostData = createServerFn({ method: 'GET' }).handler(() =>
  getPageContent('cost'),
)

export const Route = createFileRoute('/info/cost')({
  component: CostPage,
  loader: () => getCostData(),
})

function CostPage() {
  const topic = getInfoTopicByRoute('/info/cost')
  const cost = Route.useLoaderData()

  return (
    <InfoPageLayout>
      <BackLink />
      <PageHeader icon={topic.icon} title={topic.title} />

      <ContentCard>
        <p class="text-lead text-foreground/70 mb-8">{topic.description}</p>

        <div class="divide-y divide-border mb-8">
          <div class="pb-8">
            <h3 class="font-sans text-h4 font-medium text-foreground mb-4">
              {cost().headline}
            </h3>
            <ul class="space-y-3">
              <For each={cost().free_items}>
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
              <For each={cost().expenses}>
                {(expense) => (
                  <div class="flex gap-6 text-sm-copy">
                    <span class="text-muted-foreground tabular-nums min-w-[90px]">
                      {expense.amount}
                    </span>
                    <span class="text-foreground/70">
                      {expense.description}
                    </span>
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>

        <TipBox title={cost().tip_heading} class="mb-8">
          {cost().tip_body}
        </TipBox>

        <div class="border border-border rounded-lg p-6">
          <h3 class="font-sans text-h5 font-medium text-foreground mb-3">
            {cost().support_heading}
          </h3>
          <p class="text-sm-copy text-muted-foreground">
            {cost().support_body}
          </p>
        </div>
      </ContentCard>
    </InfoPageLayout>
  )
}
