import { Link } from '@tanstack/solid-router'

export function SiteFooter() {
  return (
    <footer class="border-t border-border py-12 px-6 mt-auto">
      <div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
        <div>
          <p class="font-serif text-sm-copy text-foreground mb-1">
            World Robot Olympiad™ Denmark
          </p>
          <p class="text-caption text-muted-foreground">
            World Robot Olympiad — dansk finale
          </p>
          <p class="text-caption text-muted-foreground mt-2">
            <a
              href="mailto:info@wro-denmark.dk"
              class="hover:text-foreground transition-colors"
            >
              info@wro-denmark.dk
            </a>
          </p>
          <p class="text-caption text-muted-foreground">CVR 46103564</p>
        </div>

        <nav
          aria-label="Footer navigation"
          class="flex flex-wrap gap-x-8 gap-y-3 text-caption text-muted-foreground"
        >
          <Link to="/" class="hover:text-foreground transition-colors">
            Forside
          </Link>
          <Link to="/info/date" class="hover:text-foreground transition-colors">
            Dato &amp; Sted
          </Link>
          <Link
            to="/info/prizes"
            class="hover:text-foreground transition-colors"
          >
            Præmier
          </Link>
          <Link
            to="/info/rules"
            class="hover:text-foreground transition-colors"
          >
            Regler
          </Link>
          <Link
            to="/order-a-track"
            class="hover:text-foreground transition-colors"
          >
            Bestil en bane
          </Link>
          <Link to="/blog" class="hover:text-foreground transition-colors">
            Blog
          </Link>
          <Link to="/signup" class="hover:text-foreground transition-colors">
            Tilmeld dig
          </Link>
          <Link to="/contact" class="hover:text-foreground transition-colors">
            Kontakt
          </Link>
        </nav>
      </div>
    </footer>
  )
}
