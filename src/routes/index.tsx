import { Link, createFileRoute } from '@tanstack/solid-router'
import { For } from 'solid-js'
import { Carousel } from '~/components/carousel'
import { InfoTopicCard } from '~/components/InfoTopicCard'
import { INFO_TOPICS } from '~/data/info-topics'
import { CAROUSEL_IMAGES } from '~/lib/images'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  return (
    <div class="min-h-screen bg-gray-50">
      <Carousel tint="cool" images={CAROUSEL_IMAGES}>
        <HeroContent />
      </Carousel>

      <section class="py-16 px-6 max-w-7xl mx-auto bg-gray-50">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <For each={INFO_TOPICS}>
            {(topic) => <InfoTopicCard topic={topic} />}
          </For>
        </div>
      </section>
    </div>
  )
}

function HeroContent() {
  return (
    <>
      <h1 class="text-6xl md:text-8xl font-black text-white tracking-[-0.04em] drop-shadow-2xl">
        <span class="text-gray-100">WRO</span>{' '}
        <span class="bg-linear-to-r from-wro-blue-300 to-wro-blue-400 bg-clip-text text-transparent">
          DANMARK
        </span>
      </h1>

      <p class="text-2xl md:text-3xl text-gray-200 mb-4 font-light drop-shadow-lg">
        World Robot Olympiad
      </p>

      <p class="text-lg text-gray-300 max-w-3xl mx-auto mb-8 drop-shadow-md">
        Deltag i Danmarks største robotkonkurrence for unge. Byg, programmér og
        konkurrér med din robot – og vind en rejse til verdensfinalen!
      </p>

      <div class="flex flex-col items-center gap-4">
        <Link
          to="/signup"
          class="px-8 py-3 bg-wro-blue-500 hover:bg-wro-blue-400 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-wro-blue-500/50"
        >
          Tilmeld dig nu
        </Link>
        <p class="text-gray-300 text-sm mt-2 drop-shadow">
          Læs mere nedenfor om hvorfor du skal deltage
        </p>
      </div>
    </>
  )
}
