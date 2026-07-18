import { Link } from '@tanstack/solid-router'
import type { JSX } from 'solid-js'
import { cva, cx } from '~/cva.config'
import type { FileRoutesByTo } from '~/routeTree.gen'

export const cvaNavLink = cva({
  base: 'relative px-3 py-2 text-sm font-medium text-foreground/60 rounded-lg transition-colors duration-200 hover:text-foreground hover:bg-accent',
  variants: {
    active: {
      true: 'text-foreground bg-accent',
    },
  },
})

interface NavLinkProps {
  to: keyof FileRoutesByTo
  exact?: boolean
  children: JSX.Element
}

export function NavLink(props: NavLinkProps) {
  return (
    <Link
      to={props.to}
      class={cvaNavLink()}
      activeProps={{ class: cvaNavLink({ active: true }) }}
      activeOptions={{ exact: props.exact }}
    >
      {props.children}
    </Link>
  )
}

interface ExternalLinkProps {
  href: string
  children: JSX.Element
  class?: string
}

export function ExternalLink(props: ExternalLinkProps) {
  return (
    <a
      href={props.href}
      target="_blank"
      rel="noopener noreferrer"
      class={cx(
        'text-sm text-muted-foreground hover:text-foreground transition-colors',
        props.class,
      )}
    >
      {props.children}
    </a>
  )
}
