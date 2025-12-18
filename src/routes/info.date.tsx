import { createFileRoute } from '@tanstack/solid-router'
import { Calendar, Clock, MapPin } from 'lucide-solid'
import { For } from 'solid-js'
import { BackLink, InfoPageLayout, PageHeader } from '~/components/layout'
import { ContentCard } from '~/components/ui'
import { CONSTANTS, DANISH_FINAL_SCHEDULE } from '~/data/constants'
import { getInfoTopicByRoute } from '~/data/info-topics'

export const Route = createFileRoute('/info/date')({ component: DatePage })

function DatePage() {
  const topic = getInfoTopicByRoute('/info/date')

  const formattedDate = CONSTANTS.DANISH_FINAL_DATE.toLocaleDateString(
    'da-DK',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  )

  return (
    <InfoPageLayout>
      <BackLink />
      <PageHeader icon={topic.icon} title={topic.title} />

      <ContentCard>
        <div class="grid md:grid-cols-2 gap-6 mb-8">
          <div class="flex items-start gap-4 p-6 bg-slate-700/50 rounded-lg">
            <Calendar class="w-8 h-8 text-cyan-400 shrink-0" />
            <div>
              <h3 class="text-lg font-semibold text-white mb-1">Dato</h3>
              <p class="text-gray-300 capitalize">{formattedDate}</p>
            </div>
          </div>

          <div class="flex items-start gap-4 p-6 bg-slate-700/50 rounded-lg">
            <MapPin class="w-8 h-8 text-cyan-400 shrink-0" />
            <div>
              <h3 class="text-lg font-semibold text-white mb-1">Sted</h3>
              <p class="text-gray-300">{CONSTANTS.DANISH_FINAL_LOCATION}</p>
            </div>
          </div>

          <div class="flex items-start gap-4 p-6 bg-slate-700/50 rounded-lg">
            <Clock class="w-8 h-8 text-cyan-400 shrink-0" />
            <div>
              <h3 class="text-lg font-semibold text-white mb-1">Tidspunkt</h3>
              <p class="text-gray-300">{CONSTANTS.DANISH_FINAL_TIME}</p>
            </div>
          </div>
        </div>

        <div class="prose prose-invert max-w-none">
          <h2 class="text-2xl font-semibold text-white mb-4">
            Program for dagen
          </h2>

          <div class="space-y-4">
            <For each={DANISH_FINAL_SCHEDULE}>
              {(item) => (
                <div class="flex gap-4 items-start">
                  <span class="text-cyan-400 font-mono font-bold min-w-[80px]">
                    {item.time}
                  </span>
                  <div>
                    <h4 class="text-white font-medium">{item.title}</h4>
                    <p class="text-gray-400 text-sm">{item.description}</p>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </ContentCard>
    </InfoPageLayout>
  )
}
