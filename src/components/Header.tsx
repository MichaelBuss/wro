import { Menu } from 'lucide-solid'
import {
  ExternalLink,
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
        {/* Glassmorphism background */}
        <div class="absolute inset-0 bg-wro-blue-950/80 backdrop-blur-xl border-b border-white/5" />

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

            {/* External Link - Desktop */}
            <div class="hidden md:block">
              <ExternalLink href="https://wro.dk">wro.dk ↗</ExternalLink>
            </div>

            {/* Mobile Menu Button - uses Invoker Commands! */}
            <button
              commandfor={MOBILE_DRAWER_ID}
              command="show-modal"
              class="md:hidden p-2 -mr-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
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
