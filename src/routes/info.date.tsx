import { createFileRoute } from '@tanstack/solid-router'
import { createServerFn } from '@tanstack/solid-start'
import { Calendar, Clock, MapPin } from 'lucide-solid'
import { For } from 'solid-js'
import { InfoPageLayout } from '~/components/layout'
import { ContentCard } from '~/components/ui'
import { DANISH_FINAL_SCHEDULE } from '~/data/constants'
import { getInfoTopicByRoute } from '~/data/info-topics'
import { getPageContent } from '~/server/content'

const getEventInfo = createServerFn({ method: 'GET' }).handler(() =>
  getPageContent('event-info'),
)

export const Route = createFileRoute('/info/date')({
  component: DatePage,
  loader: () => getEventInfo(),
})

function DatePage() {
  const topic = getInfoTopicByRoute('/info/date')
  const eventInfo = Route.useLoaderData()

  const formattedDate = () =>
    eventInfo().danish_final_date.toLocaleDateString('da-DK', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  return (
    <InfoPageLayout icon={topic.icon} title={topic.title}>

      <ContentCard>
        <p class="text-lead text-foreground/70 mb-8">{topic.description}</p>

        <div class="divide-y divide-border mb-8">
          <div class="flex items-start gap-4 py-5 first:pt-0">
            <Calendar class="w-5 h-5 text-primary/60 shrink-0 mt-0.5" />
            <div>
              <p class="text-caption text-muted-foreground uppercase tracking-wider mb-1">
                Dato
              </p>
              <p class="text-h5 font-medium text-foreground capitalize">
                {formattedDate()}
              </p>
            </div>
          </div>

          <div class="flex items-start gap-4 py-5">
            <MapPin class="w-5 h-5 text-primary/60 shrink-0 mt-0.5" />
            <div>
              <p class="text-caption text-muted-foreground uppercase tracking-wider mb-1">
                Sted
              </p>
              <p class="text-h5 font-medium text-foreground">
                {eventInfo().danish_final_location}
              </p>
            </div>
          </div>

          <div class="flex items-start gap-4 py-5 last:pb-0">
            <Clock class="w-5 h-5 text-primary/60 shrink-0 mt-0.5" />
            <div>
              <p class="text-caption text-muted-foreground uppercase tracking-wider mb-1">
                Tidspunkt
              </p>
              <p class="text-h5 font-medium text-foreground">
                {eventInfo().danish_final_time}
              </p>
            </div>
          </div>
        </div>

        <h2 class="font-sans text-h3 font-semibold text-foreground mb-6">
          Program for dagen
        </h2>

        <div class="divide-y divide-border">
          <For each={DANISH_FINAL_SCHEDULE}>
            {(item) => (
              <div class="flex gap-6 py-4 first:pt-0 last:pb-0">
                <span class="text-caption font-mono text-muted-foreground min-w-[64px]">
                  {item.time}
                </span>
                <div>
                  <h4 class="text-sm-copy font-medium text-foreground">
                    {item.title}
                  </h4>
                  <p class="text-caption text-muted-foreground mt-0.5">
                    {item.description}
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
