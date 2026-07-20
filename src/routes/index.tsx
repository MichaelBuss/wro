import { Link, createFileRoute } from '@tanstack/solid-router'
import { createServerFn } from '@tanstack/solid-start'
import { ArrowRight } from 'lucide-solid'
import { For, Show } from 'solid-js'
import { ArrowLink, Gallery, Heading, Lead, TipsList } from '~/components/ui'
import { DANISH_FINAL_SCHEDULE } from '~/data/constants'
import { pickGalleryHighlights, toGalleryDisplayItem } from '~/lib/gallery'
import { getCollectionItems, getPageContent } from '~/server/content'

const HOMEPAGE_GALLERY_LIMIT = 5

const getHomepageData = createServerFn({ method: 'GET' }).handler(() => {
  const hero = getPageContent('homepage')
  const eventInfo = getPageContent('event-info')
  const prizes = getPageContent('prizes')
  const cost = getPageContent('cost')
  const materials = getPageContent('materials')
  const galleryPhotos = getCollectionItems('gallery')

  const galleryItems = pickGalleryHighlights(
    galleryPhotos,
    HOMEPAGE_GALLERY_LIMIT,
  ).map(toGalleryDisplayItem)

  const allQuotes = getCollectionItems('quotes').sort(
    (a, b) => a.order - b.order,
  )
  const allPracticalTips = getCollectionItems('practical-tips').sort(
    (a, b) => a.order - b.order,
  )

  return {
    hero,
    galleryItems,
    eventInfo,
    prizes,
    cost,
    materials,
    featuredQuote: allQuotes[0],
    practicalTips: allPracticalTips.slice(0, 3),
  }
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

      <DateSection />
      <PrizesSection />
      <CostSection />
      <MaterialsSection />
      <TipsSection />
    </div>
  )
}

function HeroSection() {
  const data = Route.useLoaderData()

  return (
    <section class="pt-14 pb-16 md:pt-18 md:pb-24 px-6 max-w-5xl mx-auto">
      <div class="max-w-3xl">
        <p class="text-caption font-sans font-medium uppercase tracking-eyebrow text-muted-foreground mb-5">
          {data().hero.hero_subheading}
        </p>

        <Heading level="display" class="mb-7">
          {data().hero.hero_heading}{' '}
          <span class="text-primary">{data().hero.hero_heading_accent}</span>
        </Heading>

        <Lead class="max-w-xl mb-10">{data().hero.hero_description}</Lead>

        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <Link
            to="/login"
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
        <Link to="/galleri" class="group inline-flex items-center gap-2 mb-1">
          <Heading
            level="h2"
            class="group-hover:text-primary transition-colors"
          >
            Glimt fra tidligere år
          </Heading>
          <ArrowRight
            size={24}
            class="shrink-0 text-foreground/50 transition-all duration-200 group-hover:translate-x-1 group-hover:text-primary"
          />
        </Link>
        <p class="text-sm-copy text-muted-foreground">
          Øjeblikke fra danske WRO-finaler
        </p>
      </div>

      <Gallery items={data().galleryItems} />
    </section>
  )
}

function DateSection() {
  const data = Route.useLoaderData()

  const formattedDate = () =>
    data().eventInfo.danish_final_date.toLocaleDateString('da-DK', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  return (
    <section class="border-t border-border py-16 px-6">
      <div class="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
        <div>
          <p class="text-caption font-sans font-medium uppercase tracking-eyebrow text-muted-foreground mb-4">
            Dato & Sted
          </p>
          <p class="font-serif text-h1 font-semibold text-foreground capitalize leading-tight mb-3">
            {formattedDate()}
          </p>
          <p class="text-lead text-muted-foreground">
            {data().eventInfo.danish_final_location}
          </p>
          <p class="text-h5 text-muted-foreground mt-1">
            {data().eventInfo.danish_final_time}
          </p>
          <div class="mt-8">
            <ArrowLink to="/info/date">Se fuldt program</ArrowLink>
          </div>
        </div>

        <div>
          <p class="text-caption font-sans font-medium uppercase tracking-eyebrow text-muted-foreground mb-4">
            Program
          </p>
          <div class="divide-y divide-border">
            <For each={DANISH_FINAL_SCHEDULE}>
              {(item) => (
                <div class="flex gap-5 py-3 first:pt-0 last:pb-0">
                  <span class="text-caption font-mono text-muted-foreground min-w-[52px] shrink-0 pt-0.5">
                    {item.time}
                  </span>
                  <span class="text-sm-copy font-medium text-foreground">
                    {item.title}
                  </span>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>
    </section>
  )
}

function PrizesSection() {
  const data = Route.useLoaderData()

  const firstPrize = () => data().prizes.prizes[0]
  const otherPrizes = () => data().prizes.prizes.slice(1)

  return (
    <Show when={firstPrize()}>
      {(prize) => (
        <section class="bg-wro-blue-950 py-16 px-6">
          <div class="max-w-5xl mx-auto text-center">
            <p class="text-caption font-sans font-medium uppercase tracking-eyebrow text-white/50 mb-6">
              {prize().label}
            </p>

            <p class="font-serif text-h1 font-semibold text-white leading-tight mb-10 max-w-2xl mx-auto">
              {prize().title} — {data().eventInfo.world_final_location}
            </p>

            <hr class="border-white/15 mb-8" />

            <div class="grid grid-cols-2 gap-6 max-w-sm mx-auto mb-10">
              <For each={otherPrizes()}>
                {(otherPrize) => (
                  <div class="text-left">
                    <p class="text-caption font-sans uppercase tracking-eyebrow text-white/40 mb-1">
                      {otherPrize.label}
                    </p>
                    <p class="text-sm-copy font-medium text-white/80">
                      {otherPrize.title}
                    </p>
                  </div>
                )}
              </For>
            </div>

            <ArrowLink to="/info/prizes" variant="onDark">
              Se alle præmier
            </ArrowLink>
          </div>
        </section>
      )}
    </Show>
  )
}

function CostSection() {
  const data = Route.useLoaderData()

  return (
    <section class="border-t border-border py-16 px-6">
      <div class="max-w-5xl mx-auto">
        <p
          class="font-sans font-black text-foreground leading-none tracking-tight mb-4"
          style={{ 'font-size': 'clamp(4rem,13vw,9rem)' }}
        >
          {data().cost.headline}
        </p>
        <p class="text-lead text-foreground/70 mb-6">{data().cost.tagline}</p>
        <div class="flex flex-wrap gap-2 mb-8">
          <For each={data().cost.homepage_tags}>
            {(tag) => (
              <span class="text-caption font-sans font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                {tag}
              </span>
            )}
          </For>
        </div>
        <ArrowLink to="/info/cost">Se prisdetaljer</ArrowLink>
      </div>
    </section>
  )
}

function MaterialsSection() {
  const data = Route.useLoaderData()

  const recommendedKits = () =>
    data().materials.kits.filter((kit) => kit.recommended)

  return (
    <section class="border-t border-border py-16 px-6">
      <div class="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
        <div>
          <p class="text-caption font-sans font-medium uppercase tracking-eyebrow text-muted-foreground mb-4">
            Materialer
          </p>
          <Heading level="h2" class="mb-4">
            Hvad skal man bruge?
          </Heading>
          <p class="text-lead text-foreground/70">{data().materials.intro}</p>
          <div class="mt-8">
            <ArrowLink to="/info/materials">Se materialedetaljer</ArrowLink>
          </div>
        </div>

        <div class="flex flex-col gap-4 justify-center">
          <For each={recommendedKits()}>
            {(kit) => (
              <div class="flex items-center justify-between border border-border rounded-lg px-5 py-4">
                <span class="text-h5 font-medium text-foreground">
                  {kit.name}
                </span>
                <span class="text-caption font-medium text-wro-logo-green bg-wro-logo-green/10 px-2.5 py-0.5 rounded-full">
                  ✓ Godkendt
                </span>
              </div>
            )}
          </For>
        </div>
      </div>
    </section>
  )
}

function TipsSection() {
  const data = Route.useLoaderData()

  return (
    <section class="border-t border-border py-16 px-6">
      <div class="max-w-5xl mx-auto">
        <p class="text-caption font-sans font-medium uppercase tracking-eyebrow text-muted-foreground mb-8">
          Tips & Tricks
        </p>

        <Show when={data().featuredQuote}>
          {(quote) => (
            <blockquote class="border-l-2 border-wro-logo-orange pl-6 mb-10">
              <p class="font-serif text-h2 font-normal italic text-foreground/80 mb-4">
                "{quote().quote}"
              </p>
              <footer class="text-caption text-muted-foreground">
                <span class="font-sans not-italic font-medium text-foreground/70">
                  {quote().author}
                </span>
                <span class="ml-2">— {quote().team}</span>
              </footer>
            </blockquote>
          )}
        </Show>

        <div class="mb-8">
          <TipsList tips={data().practicalTips} />
        </div>

        <ArrowLink to="/info/tips">Læs alle tips</ArrowLink>
      </div>
    </section>
  )
}
