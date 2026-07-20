import * as PopoverPrimitive from '@kobalte/core/popover'
import { Link, useLocation } from '@tanstack/solid-router'
import { ChevronDown } from 'lucide-solid'
import { For } from 'solid-js'
import { cx } from '~/cva.config'
import { INFO_TOPICS } from '~/data/info-topics'
import { cvaNavLink } from './NavLink'

/**
 * Desktop navigation flyout built on Kobalte's Popover primitive.
 *
 * Popover (not DropdownMenu) is the correct fit: every entry is a route
 * link, so we want disclosure semantics rather than `role="menu"` command
 * semantics. Kobalte handles positioning, focus, Escape and click-outside
 * across browsers.
 */
export function NavDropdown() {
  let contentRef: HTMLElement | undefined

  const pathname = useLocation({ select: (location) => location.pathname })
  const isActive = () =>
    INFO_TOPICS.some((topic) => pathname().startsWith(topic.route))

  return (
    <PopoverPrimitive.Root placement="bottom" gutter={8}>
      <PopoverPrimitive.Trigger
        class={cx(
          cvaNavLink({ active: isActive() }),
          'group flex items-center gap-1',
        )}
      >
        Information
        <ChevronDown
          size={14}
          class="transition-transform duration-200 group-data-[expanded]:rotate-180"
        />
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={contentRef}
          // Direct the dialog's initial focus to the panel itself, not the
          // first link. Kobalte otherwise focuses the first item on every
          // open; once the session's :focus-visible modality has latched to
          // "keyboard" (after any Tab/Escape), that paints a focus ring on the
          // item every time it opens. Focusing the container keeps keyboard
          // access intact — Tab still steps into the links (with a ring) and
          // Escape returns to the trigger — without highlighting an item.
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            contentRef?.focus()
          }}
          class={cx(
            'z-50 w-64 py-2 origin-top rounded-xl border border-border bg-card shadow-lg shadow-foreground/5',
            'focus:outline-none',
            'data-[expanded]:animate-[kb-popover-in_200ms_ease-out]',
            'data-[closed]:animate-[kb-popover-out_150ms_ease-in]',
          )}
        >
          <For each={INFO_TOPICS}>
            {(topic) => (
              <Link
                to={topic.route}
                class="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/60 hover:text-foreground hover:bg-accent transition-colors"
                activeProps={{
                  class:
                    'flex items-center gap-3 px-4 py-2.5 text-sm text-foreground bg-accent',
                }}
              >
                <topic.icon class="w-4 h-4 text-primary/60" />
                <span>{topic.shortTitle}</span>
              </Link>
            )}
          </For>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
