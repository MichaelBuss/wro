import { createFileRoute } from '@tanstack/solid-router'
import { createServerFn } from '@tanstack/solid-start'
import { Show } from 'solid-js'
import { BackLink, PageShell } from '~/components/layout'
import { Heading, Lead, PhotoGrid } from '~/components/ui'
import { getFavoritePhotos, toGalleryDisplayItem } from '~/lib/gallery'
import { getCollectionItems } from '~/server/content'

const getFavorites = createServerFn({ method: 'GET' }).handler(() => {
  const photos = getCollectionItems('gallery')

  return {
    items: getFavoritePhotos(photos).map(toGalleryDisplayItem),
  }
})

export const Route = createFileRoute('/gallery_/favorites')({
  component: GalleryFavoritesPage,
  loader: () => getFavorites(),
})

function GalleryFavoritesPage() {
  const data = Route.useLoaderData()

  return (
    <PageShell size="lg">
      <BackLink to="/gallery" label="Tilbage til galleriet" />

      <Heading level="h1" class="mb-4">
        Favoritter
      </Heading>
      <Lead class="mb-8 max-w-xl text-foreground/70">
        Et udvalg af de bedste øjeblikke gennem årene.
      </Lead>

      <Show
        when={data().items.length > 0}
        fallback={
          <p class="py-8 text-sm-copy text-muted-foreground">
            Ingen favoritter endnu.
          </p>
        }
      >
        <PhotoGrid items={data().items} album={{ kind: 'favorites' }} />
      </Show>
    </PageShell>
  )
}
