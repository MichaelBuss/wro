import { Link } from '@tanstack/solid-router'
import { Show } from 'solid-js'
import { cva, cx } from '~/cva.config'
import { authClient } from '~/lib/auth-client'
import { cvaNavLink } from './NavLink'

const cvaDrawerAuthLink = cva({
  base: 'flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-foreground/70 hover:text-foreground underline-offset-4 hover:underline transition-colors',
})

interface NavAuthLinkProps {
  /** Visual context: desktop nav bar ('nav') or mobile drawer footer ('drawer'). */
  variant?: 'nav' | 'drawer'
  /** Layout/positioning classes forwarded to the rendered anchor. */
  class?: string
  onClick?: () => void
}

/**
 * Session-aware auth entry point rendered in both the desktop header and the
 * mobile drawer footer.
 *
 * Renders "Log ind" (→ /login) before the session is known (server render +
 * initial hydration) and swaps to "Mit dashboard" (→ /dashboard) once the
 * client-side session resolves. The swap is invisible for a quiet secondary
 * link with no meaningful layout shift.
 */
export function NavAuthLink(props: NavAuthLinkProps) {
  const session = authClient.useSession()

  const linkClass = () =>
    props.variant === 'drawer'
      ? cx(cvaDrawerAuthLink(), props.class)
      : cx(cvaNavLink(), props.class)

  return (
    <Show
      when={session().data}
      fallback={
        <Link to="/login" class={linkClass()} onClick={props.onClick}>
          Log ind
        </Link>
      }
    >
      <Link to="/dashboard" class={linkClass()} onClick={props.onClick}>
        Mit dashboard
      </Link>
    </Show>
  )
}
