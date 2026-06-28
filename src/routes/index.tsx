import { Link, createFileRoute } from '@tanstack/solid-router'
import { createServerFn } from '@tanstack/solid-start'
import { For, Show } from 'solid-js'
import type { GalleryItem } from '~/components/ui'
import { Gallery, Heading, Lead } from '~/components/ui'
import { INFO_TOPICS } from '~/data/info-topics'
import { getCollectionItems, getPageContent } from '~/server/content'

const getHomepageData = createServerFn({ method: 'GET' }).handler(() => {
  const hero = getPageContent('homepage')
  const carouselItems = getCollectionItems('carousel')

  const galleryItems: Array<GalleryItem> = [...carouselItems]
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .slice(0, 5)
    .map((item) => ({
      src: item.image,
      alt: item.alt,
      caption: item.description,
      year: item.year,
      objectPosition: item.position,
    }))

  return { hero, galleryItems }
})

export const Route = createFileRoute('/')({
  component: HomePage,
  loader: () => getHomepageData(),
})

function HomePage() {
  const data = Route.useLoaderData()

  return (
    <div>
      <HeroSection />

      <Show when={data().galleryItems.length > 0}>
        <GallerySection />
      </Show>

      <InfoIndex />
    </div>
  )
}

function HeroSection() {
  const data = Route.useLoaderData()

  return (
    <section class="pt-14 pb-16 md:pt-18 md:pb-24 px-6 max-w-5xl mx-auto">
      <div class="max-w-3xl">
        <p class="text-caption font-sans font-medium uppercase tracking-[0.22em] text-muted-foreground mb-5">
          {data().hero.hero_subheading}
        </p>

        <Heading level="display" class="mb-7">
          {data().hero.hero_heading}{' '}
          <span class="text-primary">{data().hero.hero_heading_accent}</span>
        </Heading>

        <Lead class="max-w-xl mb-10">{data().hero.hero_description}</Lead>

        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <Link
            to="/signup"
            class="cta-rainbow text-sm font-medium text-foreground border border-foreground/25 px-5 py-2.5 rounded-md transition-colors"
          >
            {data().hero.cta_text}
          </Link>
          <p class="text-sm-copy text-muted-foreground">
            {data().hero.cta_subtext}
          </p>
        </div>
      </div>
    </section>
  )
}

function GallerySection() {
  const data = Route.useLoaderData()

  return (
    <section class="py-12 px-6 max-w-5xl mx-auto border-t border-border">
      <div class="mb-8">
        <Heading level="h2" class="mb-1">
          Glimt fra tidligere år
        </Heading>
        <p class="text-sm-copy text-muted-foreground">
          Øjeblikke fra danske WRO-finaler
        </p>
      </div>

      <Gallery items={data().galleryItems} />
    </section>
  )
}

function InfoIndex() {
  return (
    <section class="py-12 px-6 max-w-5xl mx-auto border-t border-border">
      <Heading level="h2" class="mb-8">
        Information
      </Heading>

      <ul class="info-topics divide-y divide-border">
        <For each={INFO_TOPICS}>
          {(topic) => (
            <li style={{ '--topic-color': `var(--wro-logo-${topic.color})` }}>
              <Link
                to={topic.route}
                class="flex items-start gap-5 py-5 -mx-3 px-3 rounded hover:bg-secondary/60 transition-colors group"
              >
                <topic.icon class="topic-icon w-5 h-5 shrink-0 mt-0.5" />
                <div class="min-w-0">
                  <span class="topic-title text-h5 font-medium text-foreground transition-colors block mb-1">
                    {topic.title}
                  </span>
                  <p class="text-sm-copy text-muted-foreground leading-snug">
                    {topic.description}
                  </p>
                </div>
                <span class="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0 mt-0.5">
                  →
                </span>
              </Link>
            </li>
          )}
        </For>
      </ul>
    </section>
  )
}
