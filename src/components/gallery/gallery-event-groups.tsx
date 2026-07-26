import { For, Show } from 'solid-js'
import { Heading, PhotoGrid } from '~/components/ui'
import type { GalleryItem } from '~/components/ui'
import type { GalleryEvent } from '~/content/registry'
import { EVENT_SLUGS } from '~/lib/gallery'

export interface GalleryEventGroupData {
  key: GalleryEvent
  label: string
  location: string | undefined
  items: Array<GalleryItem>
}

interface GalleryEventGroupsProps {
  eventGroups: Array<GalleryEventGroupData>
  year: string
  /** Heading level for each event's sub-heading, sized relative to the caller's own year heading. */
  eventHeadingLevel: 'h2' | 'h3'
}

/**
 * Renders a year's photos, split into per-event sections when a year mixes
 * multiple events (e.g. Danish final vs. world final) — used by both the
 * gallery overview (`/gallery`) and the isolated year permalink
 * (`/gallery/$year`), which otherwise duplicated this exact grouping logic.
 * Skips the sub-heading entirely when there's only one event group, since a
 * lone group means the year doesn't actually mix events.
 *
 * Multi-event years identify each group via a label overlaid on its first
 * photo (see `PhotoGrid`'s `coverLabel`) rather than a heading sitting above
 * the grid — keeps the page reading as a wall of photos instead of being
 * broken up into text sections. The heading itself still renders, visually
 * hidden, so the document outline and screen readers still see a real
 * per-event heading; the event permalink stays reachable via the lightbox
 * breadcrumb (`LightboxCaption`).
 */
export function GalleryEventGroups(props: GalleryEventGroupsProps) {
  return (
    <Show
      when={props.eventGroups.length > 1}
      fallback={
        <>
          <Show when={props.eventGroups[0]?.location}>
            {(location) => (
              <p class="text-sm-copy text-muted-foreground -mt-6 mb-8">
                {location()}
              </p>
            )}
          </Show>
          <PhotoGrid
            items={props.eventGroups[0]?.items ?? []}
            album={{ kind: 'year', year: props.year }}
          />
        </>
      }
    >
      <For each={props.eventGroups}>
        {(eventGroup) => (
          <div
            id={`${props.year}-${EVENT_SLUGS[eventGroup.key]}`}
            class="mb-12 last:mb-0 scroll-mt-6"
          >
            <Heading level={props.eventHeadingLevel} class="sr-only">
              {eventGroup.label}
            </Heading>
            <PhotoGrid
              items={eventGroup.items}
              album={{ kind: 'year', year: props.year }}
              coverLabel={{
                title: eventGroup.label,
                location: eventGroup.location,
              }}
            />
          </div>
        )}
      </For>
    </Show>
  )
}
