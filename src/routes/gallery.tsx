import { Link, createFileRoute } from '@tanstack/solid-router'
import { createServerFn } from '@tanstack/solid-start'
import { For } from 'solid-js'
import { GalleryEventGroups } from '~/components/gallery/gallery-event-groups'
import { Heading, Lead } from '~/components/ui'
import {
  getYearTransitionName,
  groupGalleryByYear,
  groupPhotosByEvent,
  toGalleryDisplayItem,
} from '~/lib/gallery'
import { getCollectionItems } from '~/server/content'

const getGalleryYears = createServerFn({ method: 'GET' }).handler(() => {
  const photos = getCollectionItems('gallery')

  return groupGalleryByYear(photos).map((group) => ({
    key: group.key,
    label: group.label,
    eventGroups: groupPhotosByEvent(group.photos).map((eventGroup) => ({
      key: eventGroup.key,
      label: eventGroup.label,
      location: eventGroup.location,
      items: eventGroup.photos.map(toGalleryDisplayItem),
    })),
  }))
})

export const Route = createFileRoute('/gallery')({
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
          <section
            id={group.key}
            class="py-12 px-6 max-w-5xl mx-auto border-t border-border scroll-mt-6"
          >
            <Heading level="h2" class="mb-8">
              <Link
                to="/gallery/$year"
                params={{ year: group.key }}
                class="hover:underline"
                style={{
                  'view-transition-name': getYearTransitionName(group.key),
                }}
              >
                {group.label}
              </Link>
            </Heading>

            <GalleryEventGroups
              eventGroups={group.eventGroups}
              year={group.key}
              eventHeadingLevel="h3"
            />
          </section>
        )}
      </For>
    </div>
  )
}
