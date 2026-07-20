import { Link } from '@tanstack/solid-router'
import { cx } from '~/cva.config'

type AspectRatio = 'square' | '4/3' | '3/4' | '16/9' | '3/2'

interface FigureProps {
  src: string
  srcset?: string
  sizes?: string
  alt: string
  objectPosition?: string
  class?: string
  aspectRatio?: AspectRatio
  /** Gallery slug + year key, used to link this figure to its lightbox. */
  slug: string
  yearKey: string
}

const aspectClasses: Record<AspectRatio, string> = {
  square: 'aspect-square',
  '4/3': 'aspect-[4/3]',
  '3/4': 'aspect-[3/4]',
  '16/9': 'aspect-video',
  '3/2': 'aspect-[3/2]',
}

/**
 * Caption-less by design — the year + description read as clutter under a
 * dense teaser grid. The caption still surfaces once the visitor opens the
 * photo, via `PhotoLightbox`.
 */
export function Figure(props: FigureProps) {
  return (
    <Link
      to="/galleri/$year/$slug"
      params={{ year: props.yearKey, slug: props.slug }}
      class={cx(
        'group block overflow-hidden rounded-lg',
        aspectClasses[props.aspectRatio ?? '4/3'],
        props.class,
      )}
    >
      <img
        src={props.src}
        srcset={props.srcset}
        sizes={props.sizes}
        alt={props.alt}
        loading="lazy"
        decoding="async"
        class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
        style={{
          'object-position': props.objectPosition ?? 'center',
          'view-transition-name': `photo-${props.slug}`,
        }}
      />
    </Link>
  )
}
