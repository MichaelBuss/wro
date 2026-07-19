import { Show } from 'solid-js'

interface LightboxCaptionProps {
  caption: string | undefined
  location: string | undefined
}

/**
 * Caption + location text, always rendered wherever the lightbox chrome
 * places it — there's no toggle to show/hide it anymore, so both the
 * normal stacked chrome and the compact short-viewport bar just render
 * this directly.
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
    </>
  )
}
