import { createFileRoute } from '@tanstack/solid-router'
import { For } from 'solid-js'
import type {CarouselImage} from '~/components/HeroCarousel';
import {  HeroCarousel } from '~/components/HeroCarousel'
import { InfoTopicCard } from '~/components/InfoTopicCard'
import { INFO_TOPICS } from '~/lib/info-topics'

export const Route = createFileRoute('/')({ component: HomePage })

// Carousel images - stored in /public/images/carousel/
const CAROUSEL_IMAGES: Array<CarouselImage> = [
  { src: '/images/carousel/abu-dhabi-1.jpg', alt: 'WRO konkurrence i aktion' },
  {
    src: '/images/carousel/abu-dhabi-2.jpg',
    alt: 'Robotbyggeri og programmering',
  },
  // { src: '/images/carousel/slide-3.webp', alt: 'Hold arbejder sammen' },
  // { src: '/images/carousel/slide-4.webp', alt: 'Verdensfinalen' },
]

function HomePage() {
  return (
    <div class="min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900">
      <HeroCarousel images={CAROUSEL_IMAGES}>
        <HeroContent />
      </HeroCarousel>

      <section class="py-16 px-6 max-w-7xl mx-auto">
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
        <span class="bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
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
        <a
          href="https://wro.dk"
          target="_blank"
          rel="noopener noreferrer"
          class="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-cyan-500/50"
        >
          Tilmeld dig nu
        </a>
        <p class="text-gray-300 text-sm mt-2 drop-shadow">
          Læs mere nedenfor om hvordan du deltager
        </p>
      </div>
    </>
  )
}
