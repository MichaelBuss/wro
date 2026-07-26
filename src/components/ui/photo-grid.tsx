import { Link } from '@tanstack/solid-router'
import { For, Show } from 'solid-js'
import { cx } from '~/cva.config'
import type { GalleryItem } from './Gallery'

export interface PhotoGridCoverLabel {
  title: string
  location: string | undefined
}

interface PhotoGridProps {
  items: Array<GalleryItem>
  /** Year key shared by every item, used to build each tile's lightbox link. */
  year: string
  /**
   * Event name + location, overlaid on the first tile instead of a heading
   * above the grid — lets a year's multiple events read straight off the
   * wall of photos rather than breaking it up with text sections.
   */
  coverLabel?: PhotoGridCoverLabel
  class?: string
}

/**
 * Full photo grid for the gallery pages (as opposed to `Gallery`, which is a
 * fixed 5-item homepage teaser).
 *
 * Renders a uniform CSS Grid by default — every tile cropped to the same
 * ratio, since plain CSS can't pack variable-height tiles without JS.
 * Where CSS Grid Lanes is supported (Safari 26.4+, see
 * https://webkit.org/blog/17660/introducing-css-grid-lanes/) the `@supports`
 * block in `styles.css` upgrades this to a real masonry waterfall: photos
 * keep their natural aspect ratio and pack tightly. Both paths use native
 * `loading="lazy"` images, so photos below the fold aren't fetched until
 * the visitor scrolls near them.
 *
 * Deliberately caption-less — the year + description clutters a dense
 * grid of tiles. `item.caption` is still shown once the visitor opens a
 * photo, via `PhotoLightbox`.
 */
export function PhotoGrid(props: PhotoGridProps) {
  return (
    <div class={cx('photo-grid', props.class)}>
      <For each={props.items}>
        {(item, index) => (
          <Link
            to="/gallery/$year/$slug"
            params={{ year: props.year, slug: item.slug }}
            class="photo-grid-frame group relative block rounded-lg"
          >
            <img
              src={item.src}
              srcset={item.srcset}
              sizes={item.sizes}
              alt={item.alt}
              loading="lazy"
              decoding="async"
              class="photo-grid-image w-full transition-transform duration-700 group-hover:scale-[1.02]"
              style={{
                'object-position': item.objectPosition ?? 'center',
                'view-transition-name': `photo-${item.slug}`,
              }}
            />
            <Show when={index() === 0 && props.coverLabel}>
              {(coverLabel) => (
                <div class="absolute inset-x-0 bottom-0 rounded-b-lg bg-gradient-to-t from-black/70 via-black/20 to-transparent px-3 pt-8 pb-2.5 text-white">
                  <p class="text-sm-copy font-medium leading-tight">
                    {coverLabel().title}
                  </p>
                  <Show when={coverLabel().location}>
                    {(location) => (
                      <p class="text-caption text-white/70">{location()}</p>
                    )}
                  </Show>
                </div>
              )}
            </Show>
          </Link>
        )}
      </For>
    </div>
  )
}
