import { Link } from '@tanstack/solid-router'
import { For, Show } from 'solid-js'
import { cx } from '~/cva.config'
import type { GalleryItem } from './Gallery'

interface PhotoGridProps {
  items: Array<GalleryItem>
  /** Year key shared by every item, used to build each tile's lightbox link. */
  year: string
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
 */
export function PhotoGrid(props: PhotoGridProps) {
  return (
    <div class={cx('photo-grid', props.class)}>
      <For each={props.items}>
        {(item) => (
          <figure class="photo-grid-item group">
            <Link
              to="/galleri/$year/$slug"
              params={{ year: props.year, slug: item.slug }}
              class="block h-full w-full"
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
            </Link>
            <Show when={item.caption ?? item.year}>
              <figcaption class="mt-2 text-caption text-muted-foreground font-serif italic leading-snug">
                <Show when={item.year}>
                  <span class="not-italic font-sans mr-1">{item.year} —</span>
                </Show>
                {item.caption}
              </figcaption>
            </Show>
          </figure>
        )}
      </For>
    </div>
  )
}
