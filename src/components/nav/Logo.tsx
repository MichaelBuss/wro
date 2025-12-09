import { Link } from '@tanstack/solid-router'

export function Logo() {
  return (
    <Link
      to="/"
      class="flex items-center gap-3 hover:opacity-80 transition-opacity"
    >
      <img src="/wro-logo.webp" alt="WRO Danmark" class="h-9 w-auto" />
      <span class="hidden sm:block text-white/90 font-semibold tracking-tight">
        WRO Danmark
      </span>
    </Link>
  )
}

