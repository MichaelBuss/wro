import { Link, createFileRoute } from '@tanstack/solid-router'
import { createServerFn } from '@tanstack/solid-start'
import { Show } from 'solid-js'
import { PhotoLightbox } from '~/components/gallery/photo-lightbox'
import { Heading } from '~/components/ui'
import {
  EVENT_SLUGS,
  findAdjacentGalleryPhoto,
  toGalleryDisplayItem,
} from '~/lib/gallery'
import { getCollectionItems } from '~/server/content'

const getGalleryLightboxPhoto = createServerFn({ method: 'GET' })
  .validator((data: { year: string; slug: string }) => data)
  .handler(({ data }) => {
    const photos = getCollectionItems('gallery')
    const adjacent = findAdjacentGalleryPhoto(photos, data.year, data.slug)

    if (!adjacent) return null

    return {
      item: toGalleryDisplayItem(adjacent.photo),
      eventSlug: EVENT_SLUGS[adjacent.eventKey],
      eventLabel: adjacent.eventLabel,
      eventLocation: adjacent.eventLocation,
      prevSlug: adjacent.prevSlug,
      nextSlug: adjacent.nextSlug,
      prevItem:
        adjacent.prevPhoto === undefined
          ? undefined
          : toGalleryDisplayItem(adjacent.prevPhoto),
      nextItem:
        adjacent.nextPhoto === undefined
          ? undefined
          : toGalleryDisplayItem(adjacent.nextPhoto),
      index: adjacent.index,
      total: adjacent.total,
    }
  })

export const Route = createFileRoute('/galleri_/$year_/$slug')({
  component: GalleryLightboxPage,
  loader: async ({ params }) =>
    await getGalleryLightboxPhoto({
      data: { year: params.year, slug: params.slug },
    }),
})

function GalleryLightboxPage() {
  const data = Route.useLoaderData()
  const params = Route.useParams()

  return (
    <Show
      when={data()}
      fallback={
        <div class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background px-6 text-center">
          <Heading level="h1">Billede ikke fundet</Heading>
          <Link
            to="/galleri/$year"
            params={{ year: params().year }}
            class="text-sm-copy font-medium text-primary hover:underline"
          >
            Tilbage til galleriet
          </Link>
        </div>
      }
    >
      {(lightboxData) => (
        <PhotoLightbox
          year={params().year}
          item={lightboxData().item}
          eventSlug={lightboxData().eventSlug}
          eventLabel={lightboxData().eventLabel}
          eventLocation={lightboxData().eventLocation}
          prevSlug={lightboxData().prevSlug}
          nextSlug={lightboxData().nextSlug}
          prevItem={lightboxData().prevItem}
          nextItem={lightboxData().nextItem}
          index={lightboxData().index}
          total={lightboxData().total}
        />
      )}
    </Show>
  )
}
