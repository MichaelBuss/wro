import { Link } from '@tanstack/solid-router'

export function SiteFooter() {
  return (
    <footer class="border-t border-border py-12 px-6 mt-auto">
      <div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
        <div>
          <p class="font-serif text-sm-copy text-foreground mb-1">
            WRO Danmark
          </p>
          <p class="text-caption text-muted-foreground">
            World Robot Olympiad — dansk finale
          </p>
        </div>

        <nav aria-label="Footer navigation" class="flex flex-wrap gap-x-8 gap-y-3 text-caption text-muted-foreground">
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
          <Link to="/blog" class="hover:text-foreground transition-colors">
            Blog
          </Link>
          <Link to="/signup" class="hover:text-foreground transition-colors">
            Tilmeld dig
          </Link>
        </nav>
      </div>
    </footer>
  )
}
