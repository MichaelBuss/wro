import { Link } from '@tanstack/solid-router'
import { BookOpen, Home, X } from 'lucide-solid'
import type { ParentProps } from 'solid-js'
import { For, onMount } from 'solid-js'
import { cva, cx } from '~/cva.config'
import { INFO_TOPICS } from '~/data/info-topics'

const mobileNavLink = cva({
  base: 'flex items-center gap-3 px-4 py-3 text-foreground/60 hover:text-foreground hover:bg-accent transition-colors rounded-lg mx-2',
  variants: {
    active: {
      true: 'text-foreground bg-accent',
      false: '',
    },
  },
  defaultVariants: { active: false },
})

const panelClasses = [
  'ml-auto',
  'h-full',
  'w-[min(85vw,320px)]',
  'bg-background',
  'border-l',
  'border-border',
  'shadow-xl',
  'shadow-foreground/5',
  'flex',
  'flex-col',
  'translate-x-0',
  'transition-transform',
  'duration-300',
  'ease-[cubic-bezier(0.32,0.72,0,1)]',
  'starting:translate-x-full',
]

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
  'backdrop:bg-black/25',
  'backdrop:backdrop-blur-sm',
  'backdrop:transition-all',
  'backdrop:duration-300',
  'starting:backdrop:bg-black/0',
  'starting:backdrop:backdrop-blur-0',
]

export const MOBILE_DRAWER_ID = 'mobile-drawer'

const closeDrawer = () => {
  document.getElementById(MOBILE_DRAWER_ID)?.closest('dialog')?.close()
}

/**
 * Mobile navigation drawer using native <dialog> with modern features:
 *
 * - Invoker Commands (Chrome 135): Open/close declaratively with commandfor/command
 * - Dialog Light Dismiss (Chrome 134): closedby="any" for click-outside-to-close
 */
export function MobileDrawer() {
  let dialogRef: HTMLDialogElement | undefined

  onMount(() => {
    if (dialogRef) {
      dialogRef.setAttribute('closedby', 'any')
    }
  })

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
        <div class="flex items-center justify-between p-4 border-b border-border">
          <span class="text-sm-copy font-medium text-foreground">
            Navigation
          </span>
          <button
            commandfor={MOBILE_DRAWER_ID}
            command="close"
            class="p-2 -mr-2 text-foreground/60 hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            aria-label="Luk menu"
          >
            <X size={20} />
          </button>
        </div>

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
                  <topic.icon class="w-[18px] h-[18px] text-primary/60" />
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

        <div class="p-4 border-t border-border">
          <Link
            to="/signup"
            onClick={closeDrawer}
            class="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-foreground/70 hover:text-foreground underline-offset-4 hover:underline transition-colors"
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
        <span class="text-caption font-medium uppercase tracking-wider text-muted-foreground">
          {props.title}
        </span>
      </div>
      {props.children}
    </div>
  )
}
