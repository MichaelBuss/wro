import * as DialogPrimitive from '@kobalte/core/dialog'
import { Link } from '@tanstack/solid-router'
import { BookOpen, Home, Menu, X } from 'lucide-solid'
import type { ParentProps } from 'solid-js'
import { For, createSignal } from 'solid-js'
import { cva, cx } from '~/cva.config'
import { INFO_TOPICS } from '~/data/info-topics'
import { NavAuthLink } from './NavAuthLink'

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

/**
 * Mobile navigation drawer built on Kobalte's Dialog primitive.
 *
 * Kobalte gives us the focus trap, scroll lock, Escape handling and
 * click-outside dismissal for free, cross-browser. Open state is controlled
 * so that following a nav link also closes the drawer.
 */
export function MobileDrawer() {
  const [open, setOpen] = createSignal(false)
  const close = () => setOpen(false)

  return (
    <DialogPrimitive.Root open={open()} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        aria-label="Åbn menu"
        class="md:hidden p-2 -mr-2 text-foreground/60 hover:text-foreground hover:bg-accent rounded-lg transition-colors"
      >
        <Menu size={22} />
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          class={cx(
            'fixed inset-0 z-50 bg-black/25 backdrop-blur-sm',
            'data-[expanded]:animate-[kb-overlay-in_300ms_ease]',
            'data-[closed]:animate-[kb-overlay-out_200ms_ease]',
          )}
        />
        <DialogPrimitive.Content
          class={cx(
            'fixed inset-y-0 right-0 z-50 flex h-full w-[min(85vw,320px)] flex-col',
            'bg-background border-l border-border shadow-xl shadow-foreground/5',
            'focus:outline-none',
            'data-[expanded]:animate-[kb-drawer-in_300ms_cubic-bezier(0.32,0.72,0,1)]',
            'data-[closed]:animate-[kb-drawer-out_250ms_ease-in]',
          )}
        >
          <div class="flex items-center justify-between p-4 border-b border-border">
            <DialogPrimitive.Title class="text-sm-copy font-medium text-foreground">
              Navigation
            </DialogPrimitive.Title>
            <DialogPrimitive.CloseButton
              aria-label="Luk menu"
              class="p-2 -mr-2 text-foreground/60 hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              <X size={20} />
            </DialogPrimitive.CloseButton>
          </div>

          <nav class="flex-1 py-4 overflow-y-auto">
            <Link
              to="/"
              onClick={close}
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
                    onClick={close}
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
                onClick={close}
                class={mobileNavLink({ active: false })}
                activeProps={{ class: mobileNavLink({ active: true }) }}
              >
                <BookOpen size={18} />
                <span>Blog</span>
              </Link>
            </MobileNavSection>
          </nav>

          <div class="p-4 border-t border-border">
            <NavAuthLink variant="drawer" onClick={close} />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
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
