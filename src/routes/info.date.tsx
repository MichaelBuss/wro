import { Link, createFileRoute } from '@tanstack/solid-router'
import { For } from 'solid-js'
import { ArrowLeft, Calendar, Clock, MapPin } from 'lucide-solid'
import { CONSTANTS, DANISH_FINAL_SCHEDULE } from '~/lib/constants'
import { getInfoTopicByRoute } from '~/lib/info-topics'

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
    <div class="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <section class="py-16 px-6 max-w-4xl mx-auto">
        <Link
          to="/"
          class="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors mb-8"
        >
          <ArrowLeft size={20} />
          <span>Tilbage til forsiden</span>
        </Link>

        <div class="flex items-center gap-4 mb-8">
          {topic.icon}
          <h1 class="text-4xl md:text-5xl font-bold text-white">
            <span class="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {topic.title}
            </span>
          </h1>
        </div>

        <div class="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8">
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
        </div>
      </section>
    </div>
  )
}
