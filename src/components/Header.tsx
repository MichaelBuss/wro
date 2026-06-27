import { Link } from '@tanstack/solid-router'
import { Menu } from 'lucide-solid'
import {
  Logo,
  MOBILE_DRAWER_ID,
  MobileDrawer,
  NavDropdown,
  NavLink,
} from './nav'

/**
 * Site header with responsive navigation.
 *
 * Uses modern web platform features:
 * - Invoker Commands for declarative dialog control (no state management!)
 * - Popover API for dropdown menus
 * - CSS Anchor Positioning for precise placement
 */
export default function Header() {
  return (
    <>
      <header class="sticky top-0 z-40 w-full">
        <div class="absolute inset-0 bg-background/90 backdrop-blur-xl border-b border-border" />

        <nav class="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div class="flex items-center justify-between h-16">
            <Logo />

            {/* Desktop Navigation */}
            <div class="hidden md:flex items-center gap-1">
              <NavLink to="/" exact>
                Forside
              </NavLink>
              <NavDropdown />
              <NavLink to="/blog">Blog</NavLink>
            </div>

            {/* Quiet signup link */}
            <Link
              to="/signup"
              class="hidden md:inline-flex text-sm text-foreground/60 hover:text-foreground underline-offset-4 hover:underline transition-colors"
            >
              Tilmeld dig
            </Link>

            {/* Mobile Menu Button */}
            <button
              commandfor={MOBILE_DRAWER_ID}
              command="show-modal"
              class="md:hidden p-2 -mr-2 text-foreground/60 hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              aria-label="Åbn menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </nav>
      </header>

      <MobileDrawer />
    </>
  )
}
