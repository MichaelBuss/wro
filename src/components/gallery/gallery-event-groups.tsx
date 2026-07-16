import { Link } from '@tanstack/solid-router'
import { For, Show } from 'solid-js'
import { Heading, PhotoGrid } from '~/components/ui'
import type { GalleryItem } from '~/components/ui'
import type { GalleryEvent } from '~/content/registry'
import { EVENT_SLUGS, getEventTransitionName } from '~/lib/gallery'

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
 * gallery overview (`/galleri`) and the isolated year permalink
 * (`/galleri/$year`), which otherwise duplicated this exact grouping logic.
 * Skips the sub-heading entirely when there's only one event group, since a
 * lone group means the year doesn't actually mix events.
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
            year={props.year}
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
            <div class="mb-6">
              <Heading level={props.eventHeadingLevel} class="mb-1">
                <Link
                  to="/galleri/$year/event/$event"
                  params={{
                    year: props.year,
                    event: EVENT_SLUGS[eventGroup.key],
                  }}
                  class="hover:underline"
                  style={{
                    'view-transition-name': getEventTransitionName(
                      props.year,
                      EVENT_SLUGS[eventGroup.key],
                    ),
                  }}
                >
                  {eventGroup.label}
                </Link>
              </Heading>
              <Show when={eventGroup.location}>
                {(location) => (
                  <p class="text-sm-copy text-muted-foreground">{location()}</p>
                )}
              </Show>
            </div>
            <PhotoGrid items={eventGroup.items} year={props.year} />
          </div>
        )}
      </For>
    </Show>
  )
}
