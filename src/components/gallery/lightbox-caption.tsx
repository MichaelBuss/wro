import { Link } from '@tanstack/solid-router'
import { Show } from 'solid-js'

interface LightboxCaptionProps {
  year: string
  eventSlug: string
  eventLabel: string
  caption: string | undefined
  location: string | undefined
}

/**
 * Caption + location text, plus a year/event breadcrumb below it, always
 * rendered wherever the lightbox chrome places it — there's no toggle to
 * show/hide it anymore, so both the normal stacked chrome and the compact
 * short-viewport bar just render this directly. The breadcrumb segments
 * link to the year (`/gallery/$year`) and event (`/gallery/$year/event/$event`)
 * permalinks independently, so either can be followed straight from the
 * lightbox without closing it first.
 */
export function LightboxCaption(props: LightboxCaptionProps) {
  return (
    <>
      <Show when={props.caption}>
        {(caption) => <p class="font-serif italic text-sm-copy">{caption()}</p>}
      </Show>
      <Show when={props.location}>
        {(location) => <p class="text-caption text-white/50">{location()}</p>}
      </Show>
      <p class="text-caption text-white/50">
        <Link
          to="/gallery/$year"
          params={{ year: props.year }}
          class="hover:text-white hover:underline"
        >
          {props.year}
        </Link>
        {' › '}
        <Link
          to="/gallery/$year/event/$event"
          params={{ year: props.year, event: props.eventSlug }}
          class="hover:text-white hover:underline"
        >
          {props.eventLabel}
        </Link>
      </p>
    </>
  )
}
