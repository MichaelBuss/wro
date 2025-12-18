import { Link } from '@tanstack/solid-router'
import { BookOpen, Home, X } from 'lucide-solid'
import type { ParentProps } from 'solid-js'
import { For, onMount } from 'solid-js'
import { cva, cx } from '~/cva.config'
import { INFO_TOPICS } from '~/data/info-topics'

// Mobile nav link styles
const mobileNavLink = cva({
  base: 'flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 transition-colors rounded-lg mx-2',
  variants: {
    active: {
      true: 'text-white bg-white/10',
      false: '',
    },
  },
  defaultVariants: { active: false },
})

// Panel classes as array for readability
const panelClasses = [
  'ml-auto',
  'h-full',
  'w-[min(85vw,320px)]',
  'bg-wro-blue-950/95',
  'backdrop-blur-xl',
  'border-l',
  'border-white/10',
  'shadow-2xl',
  'flex',
  'flex-col',
  // Slide animation using Tailwind's starting: variant
  'translate-x-0',
  'transition-transform',
  'duration-300',
  'ease-[cubic-bezier(0.32,0.72,0,1)]',
  'starting:translate-x-full',
]

// Dialog classes as array - using Tailwind's backdrop: and starting: variants
const dialogClasses = [
  'fixed',
  'inset-0',
  'm-0',
  'p-0',
  'w-full',
  'h-full',
  'max-w-none',
  'max-h-none',
  'bg-transparent',
  // Backdrop styles
  'backdrop:bg-black/40',
  'backdrop:backdrop-blur-sm',
  'backdrop:transition-all',
  'backdrop:duration-300',
  // Backdrop entry animation
  'starting:backdrop:bg-black/0',
  'starting:backdrop:backdrop-blur-0',
]

/** Dialog ID for invoker commands */
export const MOBILE_DRAWER_ID = 'mobile-drawer'

/** Close the mobile drawer (for use in nav links) */
const closeDrawer = () => {
  document.getElementById(MOBILE_DRAWER_ID)?.closest('dialog')?.close()
}

/**
 * Mobile navigation drawer using native <dialog> with modern features:
 *
 * - Invoker Commands (Chrome 135): Open/close declaratively with commandfor/command
 * - Dialog Light Dismiss (Chrome 134): closedby="any" for click-outside-to-close
 * - No JavaScript state syncing needed!
 *
 * @see https://chrome.dev/css-wrapped-2025/#invoker-commands
 * @see https://chrome.dev/css-wrapped-2025/#dialog-light-dismiss
 */
export function MobileDrawer() {
  let dialogRef: HTMLDialogElement | undefined

  // Set closedby attribute (not in JSX types yet)
  onMount(() => {
    if (dialogRef) {
      dialogRef.setAttribute('closedby', 'any')
    }
  })

  // Fallback backdrop click handler (for browsers without closedby="any")
  const handleClick = (e: MouseEvent) => {
    if (e.target === dialogRef) {
      dialogRef.close()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      id={MOBILE_DRAWER_ID}
      onClick={handleClick}
      class={cx(dialogClasses)}
    >
      <div class={cx(panelClasses)}>
        {/* Header */}
        <div class="flex items-center justify-between p-4 border-b border-white/10">
          <span class="text-white/90 font-medium">Navigation</span>
          {/* Close button using Invoker Commands */}
          <button
            commandfor={MOBILE_DRAWER_ID}
            command="close"
            class="p-2 -mr-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            aria-label="Luk menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav class="flex-1 py-4 overflow-y-auto">
          <Link
            to="/"
            onClick={closeDrawer}
            class={mobileNavLink({ active: false })}
            activeProps={{ class: mobileNavLink({ active: true }) }}
            activeOptions={{ exact: true }}
          >
            <Home size={18} />
            <span>Forside</span>
          </Link>

          <MobileNavSection title="Information">
            <For each={INFO_TOPICS}>
              {(topic) => (
                <Link
                  to={topic.route}
                  onClick={closeDrawer}
                  class={mobileNavLink({ active: false })}
                  activeProps={{ class: mobileNavLink({ active: true }) }}
                >
                  <topic.icon class="w-[18px] h-[18px] text-wro-blue-300/70" />
                  <span>{topic.shortTitle}</span>
                </Link>
              )}
            </For>
          </MobileNavSection>

          <MobileNavSection title="Mere">
            <Link
              to="/blog"
              onClick={closeDrawer}
              class={mobileNavLink({ active: false })}
              activeProps={{ class: mobileNavLink({ active: true }) }}
            >
              <BookOpen size={18} />
              <span>Blog</span>
            </Link>
          </MobileNavSection>
        </nav>

        {/* Footer */}
        <div class="p-4 border-t border-white/10">
          <Link
            to="/signup"
            onClick={closeDrawer}
            class="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-400 rounded-lg transition-colors"
          >
            Tilmeld dig nu
          </Link>
        </div>
      </div>
    </dialog>
  )
}

function MobileNavSection(props: ParentProps<{ title: string }>) {
  return (
    <div class="mt-4">
      <div class="mb-2 px-4">
        <span class="text-xs font-medium uppercase tracking-wider text-white/40">
          {props.title}
        </span>
      </div>
      {props.children}
    </div>
  )
}
