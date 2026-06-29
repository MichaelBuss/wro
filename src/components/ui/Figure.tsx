import { Show } from 'solid-js'
import { cx } from '~/cva.config'

type AspectRatio = 'square' | '4/3' | '3/4' | '16/9' | '3/2'

interface FigureProps {
  src: string
  srcset?: string
  sizes?: string
  alt: string
  caption?: string
  year?: number | string
  objectPosition?: string
  class?: string
  aspectRatio?: AspectRatio
}

const aspectClasses: Record<AspectRatio, string> = {
  square: 'aspect-square',
  '4/3': 'aspect-[4/3]',
  '3/4': 'aspect-[3/4]',
  '16/9': 'aspect-video',
  '3/2': 'aspect-[3/2]',
}

export function Figure(props: FigureProps) {
  return (
    <figure class={cx('group', props.class)}>
      <div
        class={cx('overflow-hidden', aspectClasses[props.aspectRatio ?? '4/3'])}
      >
        <img
          src={props.src}
          srcset={props.srcset}
          sizes={props.sizes}
          alt={props.alt}
          loading="lazy"
          decoding="async"
          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          style={{ 'object-position': props.objectPosition ?? 'center' }}
        />
      </div>
      <Show when={props.caption ?? props.year}>
        <figcaption class="mt-2 text-caption text-muted-foreground font-serif italic leading-snug">
          <Show when={props.year}>
            <span class="not-italic font-sans mr-1">{props.year} —</span>
          </Show>
          {props.caption}
        </figcaption>
      </Show>
    </figure>
  )
}
