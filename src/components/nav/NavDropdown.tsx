import { Link } from '@tanstack/solid-router'
import { ChevronDown } from 'lucide-solid'
import { For, createSignal, onMount } from 'solid-js'
import { cx } from '~/cva.config'
import { INFO_TOPICS } from '~/data/info-topics'

const navLinkBase =
  'relative px-3 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors duration-200'

// Popover classes as array for readability
const popoverClasses = [
  'w-64',
  'py-2',
  'bg-wro-blue-950',
  'rounded-xl',
  'border',
  'border-white/10',
  'shadow-2xl',
  // Animation
  'origin-top',
  'transition-all',
  'duration-200',
  'opacity-100',
  'scale-100',
  // Entry animation using Tailwind's starting: variant
  'starting:opacity-0',
  'starting:scale-95',
]

/**
 * Desktop navigation dropdown using modern web APIs:
 * - Popover API (popover="auto", popoverTargetElement)
 * - CSS Anchor Positioning (anchor-name, position-anchor, anchor())
 * - Tailwind starting: variant for entry animations
 *
 * All positioning is inline so multiple dropdowns can coexist,
 * each with their own anchor name.
 */
export function NavDropdown() {
  const [isOpen, setIsOpen] = createSignal(false)
  let triggerRef: HTMLButtonElement | undefined
  let popoverRef: HTMLDivElement | undefined

  onMount(() => {
    if (popoverRef && triggerRef) {
      popoverRef.popover = 'auto'
      triggerRef.popoverTargetElement = popoverRef
    }
  })

  const handleToggle = (e: ToggleEvent) => {
    setIsOpen(e.newState === 'open')
  }

  // Unique anchor name for this dropdown instance
  const anchorName = '--nav-info'

  return (
    <div class="relative">
      <button
        ref={triggerRef}
        class={cx(navLinkBase, 'flex items-center gap-1')}
        style={{ 'anchor-name': anchorName }}
        aria-expanded={isOpen()}
        aria-haspopup="menu"
      >
        Information
        <ChevronDown
          size={14}
          class={cx(
            'transition-transform duration-200',
            isOpen() && 'rotate-180',
          )}
        />
      </button>

      <div
        ref={popoverRef}
        onToggle={handleToggle}
        role="menu"
        class={cx(popoverClasses)}
        style={{
          'position-anchor': anchorName,
          inset: 'unset',
          top: 'anchor(bottom)',
          left: 'anchor(center)',
          translate: '-50% 0.5rem',
        }}
      >
        <For each={INFO_TOPICS}>
          {(topic) => (
            <Link
              to={topic.route}
              onClick={() => popoverRef?.hidePopover()}
              class="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              activeProps={{
                class:
                  'flex items-center gap-3 px-4 py-2.5 text-sm text-white bg-white/10',
              }}
              role="menuitem"
            >
              <topic.icon class="w-4 h-4 text-cyan-400/70" />
              <span>{topic.shortTitle}</span>
            </Link>
          )}
        </For>
      </div>
    </div>
  )
}
