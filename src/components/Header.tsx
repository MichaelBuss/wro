import { Logo, MobileDrawer, NavAuthLink, NavDropdown, NavLink } from './nav'

/**
 * Site header with responsive navigation.
 *
 * Interactive nav (desktop flyout + mobile drawer) is built on Kobalte
 * primitives for cross-browser positioning, focus management and a11y.
 */
export default function Header() {
  return (
    <header class="header-sticky sticky top-0 z-40 w-full">
      <div class="header-surface absolute inset-0 bg-background/90 backdrop-blur-xl border-b border-border" />

      <nav
        aria-label="Primær navigation"
        class="relative max-w-6xl mx-auto px-4 sm:px-6"
      >
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

          <NavAuthLink class="hidden md:inline-flex" />

          {/* Mobile navigation drawer (owns its trigger) */}
          <MobileDrawer />
        </div>
      </nav>
    </header>
  )
}
