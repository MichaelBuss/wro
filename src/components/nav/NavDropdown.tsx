import { Link } from '@tanstack/solid-router'
import { ChevronDown } from 'lucide-solid'
import { For, createSignal, onMount } from 'solid-js'
import { cx } from '~/cva.config'
import { INFO_TOPICS } from '~/data/info-topics'
import { cvaNavLink } from './NavLink'

const popoverClasses = [
  'w-64',
  'py-2',
  'bg-card',
  'rounded-xl',
  'border',
  'border-border',
  'shadow-lg',
  'shadow-foreground/5',
  // Animation
  'origin-top',
  'transition-all',
  'duration-200',
  'opacity-100',
  'scale-100',
  'starting:opacity-0',
  'starting:scale-95',
]

/**
 * Desktop navigation dropdown using modern web APIs:
 * - Popover API (popover="auto", popoverTargetElement)
 * - CSS Anchor Positioning (anchor-name, position-anchor, anchor())
 * - Tailwind starting: variant for entry animations
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

  const popoverId = 'nav-info-popover'

  return (
    <div class="relative">
      <button
        ref={triggerRef}
        type="button"
        class={cx(cvaNavLink(), 'flex items-center gap-1 nav-info-trigger')}
        aria-expanded={isOpen()}
        aria-haspopup="true"
        aria-controls={popoverId}
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
        id={popoverId}
        ref={popoverRef}
        onToggle={handleToggle}
        class={cx(popoverClasses, 'nav-info-popover')}
      >
        <For each={INFO_TOPICS}>
          {(topic) => (
            <Link
              to={topic.route}
              onClick={() => popoverRef?.hidePopover()}
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
      </div>
    </div>
  )
}
