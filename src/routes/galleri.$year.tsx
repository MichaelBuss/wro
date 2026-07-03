import { createFileRoute } from '@tanstack/solid-router'
import { createServerFn } from '@tanstack/solid-start'
import { Show } from 'solid-js'
import { BackLink, PageShell } from '~/components/layout'
import { Heading, PhotoGrid } from '~/components/ui'
import { groupGalleryByYear, toGalleryDisplayItem } from '~/lib/gallery'
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
      items: group.photos.map(toGalleryDisplayItem),
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
            <PhotoGrid items={yearData().items} />
          </>
        )}
      </Show>
    </PageShell>
  )
}
