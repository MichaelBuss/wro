import { createRouter } from '@tanstack/solid-router'
import type { ParsedLocation } from '@tanstack/solid-router'
import { galleryTransitionTypes } from './lib/view-transitions'
import { routeTree } from './routeTree.gen'

// Homepage (gallery teaser lives there) and the whole `/gallery` tree
// (index, year, lightbox) — the only surfaces that share `view-transition-name`d
// photos, so navigations elsewhere (organizer/dashboard/login etc.) stay untouched.
const GALLERY_TRANSITION_PATH = /^\/gallery(\/|$)|^\/$/

function isGalleryTransitionLocation(
  location: ParsedLocation | undefined,
): boolean {
  return (
    location !== undefined && GALLERY_TRANSITION_PATH.test(location.pathname)
  )
}

// Create a new router instance
export const getRouter = () => {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultViewTransition: {
      types: ({ fromLocation, toLocation }) => {
        const isGalleryNavigation =
          isGalleryTransitionLocation(fromLocation) &&
          isGalleryTransitionLocation(toLocation)

        if (!isGalleryNavigation) return false

        return galleryTransitionTypes(['fade'])
      },
    },
  })
  return router
}
