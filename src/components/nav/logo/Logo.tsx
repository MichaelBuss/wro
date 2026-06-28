import { Link } from '@tanstack/solid-router'
import { WroLogoMark } from './WroLogoMark'

export function Logo() {
  return (
    <Link
      to="/"
      aria-label="WRO Danmark"
      class="flex items-center hover:opacity-80 transition-opacity"
    >
      <WroLogoMark class="h-9 w-auto" interactive />
    </Link>
  )
}
