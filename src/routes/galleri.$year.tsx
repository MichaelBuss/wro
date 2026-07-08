import { createFileRoute } from '@tanstack/solid-router'
import { createServerFn } from '@tanstack/solid-start'
import { For, Show } from 'solid-js'
import { BackLink, PageShell } from '~/components/layout'
import { Heading, PhotoGrid } from '~/components/ui'
import {
  groupGalleryByYear,
  groupPhotosByEvent,
  toGalleryDisplayItem,
} from '~/lib/gallery'
import { getCollectionItems } from '~/server/content'

const getGalleryYear = createServerFn({ method: 'GET' })
  .validator((year: string) => year)
  .handler(({ data: year }) => {
    const photos = getCollectionItems('gallery')
    const group = groupGalleryByYear(photos).find((g) => g.key === year)

    if (!group) {
      return null
    }

    return {
      label: group.label,
      eventGroups: groupPhotosByEvent(group.photos).map((eventGroup) => ({
        key: eventGroup.key,
        label: eventGroup.label,
        items: eventGroup.photos.map(toGalleryDisplayItem),
      })),
    }
  })

export const Route = createFileRoute('/galleri/$year')({
  component: GalleryYearPage,
  loader: async ({ params }) => await getGalleryYear({ data: params.year }),
})

function GalleryYearPage() {
  const data = Route.useLoaderData()

  return (
    <PageShell size="lg">
      <BackLink to="/galleri" label="Tilbage til galleriet" />

      <Show
        when={data()}
        fallback={
          <div class="text-center py-16">
            <Heading level="h1" class="mb-6">
              Galleri ikke fundet
            </Heading>
          </div>
        }
      >
        {(yearData) => (
          <>
            <Heading level="h1" class="mb-8">
              {yearData().label}
            </Heading>
            <Show
              when={yearData().eventGroups.length > 1}
              fallback={
                <PhotoGrid items={yearData().eventGroups[0]?.items ?? []} />
              }
            >
              <For each={yearData().eventGroups}>
                {(group) => (
                  <section class="mb-12 last:mb-0">
                    <Heading level="h2" class="mb-6">
                      {group.label}
                    </Heading>
                    <PhotoGrid items={group.items} />
                  </section>
                )}
              </For>
            </Show>
          </>
        )}
      </Show>
    </PageShell>
  )
}
