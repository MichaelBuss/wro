import { createFileRoute } from '@tanstack/solid-router'
import { createServerFn } from '@tanstack/solid-start'
import { Show } from 'solid-js'
import { BackLink, PageShell } from '~/components/layout'
import { Heading, PhotoGrid } from '~/components/ui'
import {
  getEventFromSlug,
  getEventTransitionName,
  groupGalleryByYear,
  groupPhotosByEvent,
  toGalleryDisplayItem,
} from '~/lib/gallery'
import { getCollectionItems } from '~/server/content'

const getGalleryEvent = createServerFn({ method: 'GET' })
  .validator((data: { year: string; event: string }) => data)
  .handler(({ data }) => {
    const event = getEventFromSlug(data.event)
    if (!event) return null

    const photos = getCollectionItems('gallery')
    const editions = getCollectionItems('gallery-editions')
    const yearGroup = groupGalleryByYear(photos).find(
      (group) => group.key === data.year,
    )
    if (!yearGroup) return null

    const eventGroup = groupPhotosByEvent(yearGroup.photos, editions).find(
      (group) => group.key === event,
    )
    if (!eventGroup) return null

    return {
      yearLabel: yearGroup.label,
      label: eventGroup.label,
      location: eventGroup.location,
      items: eventGroup.photos.map(toGalleryDisplayItem),
    }
  })

export const Route = createFileRoute('/galleri_/$year_/event/$event')({
  component: GalleryEventPage,
  loader: async ({ params }) =>
    await getGalleryEvent({
      data: { year: params.year, event: params.event },
    }),
})

function GalleryEventPage() {
  const data = Route.useLoaderData()
  const params = Route.useParams()

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
        {(eventData) => (
          <>
            <Heading
              level="h1"
              class="mb-1"
              style={{
                'view-transition-name': getEventTransitionName(
                  params().year,
                  params().event,
                ),
              }}
            >
              {eventData().label}
            </Heading>
            <p class="text-sm-copy text-muted-foreground mb-8">
              {eventData().yearLabel}
              <Show when={eventData().location}>
                {(location) => <> — {location()}</>}
              </Show>
            </p>
            <PhotoGrid items={eventData().items} year={params().year} />
          </>
        )}
      </Show>
    </PageShell>
  )
}
