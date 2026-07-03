import { Link, createFileRoute } from '@tanstack/solid-router'
import { createServerFn } from '@tanstack/solid-start'
import { For, Show } from 'solid-js'
import { Heading, Lead, PhotoGrid } from '~/components/ui'
import {
  groupGalleryByYear,
  pickGalleryHighlights,
  toGalleryDisplayItem,
} from '~/lib/gallery'
import { getCollectionItems } from '~/server/content'

const YEAR_TEASER_LIMIT = 6

const getGalleryYears = createServerFn({ method: 'GET' }).handler(() => {
  const photos = getCollectionItems('gallery')

  return groupGalleryByYear(photos).map((group) => {
    const highlights = pickGalleryHighlights(group.photos, YEAR_TEASER_LIMIT)

    return {
      key: group.key,
      label: group.label,
      totalCount: group.photos.length,
      highlights: highlights.map(toGalleryDisplayItem),
    }
  })
})

export const Route = createFileRoute('/galleri')({
  component: GalleryPage,
  loader: () => getGalleryYears(),
})

function GalleryPage() {
  const yearGroups = Route.useLoaderData()

  return (
    <div>
      <section class="pt-14 pb-10 md:pt-18 px-6 max-w-5xl mx-auto">
        <Heading level="display" class="mb-5">
          Galleri
        </Heading>
        <Lead class="max-w-xl text-foreground/70">
          Øjeblikke fra danske WRO-finaler gennem årene.
        </Lead>
      </section>

      <For
        each={yearGroups()}
        fallback={
          <p class="px-6 max-w-5xl mx-auto py-8 text-sm-copy text-muted-foreground">
            Ingen billeder endnu.
          </p>
        }
      >
        {(group) => (
          <section class="py-12 px-6 max-w-5xl mx-auto border-t border-border">
            <div class="flex items-end justify-between gap-4 mb-8">
              <Heading level="h2">{group.label}</Heading>
              <Show when={group.totalCount > group.highlights.length}>
                <Link
                  to="/galleri/$year"
                  params={{ year: group.key }}
                  class="text-sm-copy font-medium text-primary hover:underline shrink-0"
                >
                  Se alle {group.totalCount} billeder →
                </Link>
              </Show>
            </div>

            <PhotoGrid items={group.highlights} />
          </section>
        )}
      </For>
    </div>
  )
}
