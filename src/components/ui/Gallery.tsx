import { For } from 'solid-js'
import { cx } from '~/cva.config'
import type { LightboxAlbum } from '~/lib/gallery'
import { Figure } from './Figure'

export interface GalleryItem {
  src: string
  srcset?: string
  sizes?: string
  width: number
  height: number
  /** Dominant color as `#rrggbb` — see src/content/registry.ts. */
  color: string
  alt: string
  caption?: string
  year: number
  objectPosition?: string
  slug: string
  yearKey: string
  /**
   * Which album a tile opens into. Optional — omitted tiles open into their
   * own year album (see `Figure`). The homepage sets `favorites` on genuine
   * favourites so they page through the favourites collection.
   */
  album?: LightboxAlbum
}

interface GalleryProps {
  items: Array<GalleryItem>
  class?: string
}

/**
 * Editorial photo gallery in an asymmetric grid:
 * - Mobile: single column
 * - sm+: first image spans 2 cols (wide, 16:9), remaining images at 4:3
 * - lg+: 3-column grid with first spanning 2
 */
export function Gallery(props: GalleryProps) {
  return (
    <div class={cx('grid grid-cols-1 sm:grid-cols-3 gap-3', props.class)}>
      <For each={props.items.slice(0, 5)}>
        {(item, index) => (
          <Figure
            src={item.src}
            srcset={item.srcset}
            sizes={item.sizes}
            alt={item.alt}
            objectPosition={item.objectPosition}
            slug={item.slug}
            yearKey={item.yearKey}
            album={item.album}
            class={index() === 0 ? 'sm:col-span-2' : undefined}
            aspectRatio={index() === 0 ? '16/9' : '4/3'}
          />
        )}
      </For>
    </div>
  )
}
