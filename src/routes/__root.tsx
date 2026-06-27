import '@fontsource/inter'
import '@fontsource/fraunces/400.css'
import '@fontsource/fraunces/400-italic.css'
import '@fontsource/fraunces/700.css'
import '@fontsource/fraunces/700-italic.css'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/solid-router'
import { TanStackRouterDevtools } from '@tanstack/solid-router-devtools'
import { Suspense } from 'solid-js'
import { HydrationScript } from 'solid-js/web'
import Header from '../components/Header'
import TanStackQueryProvider from '../integrations/tanstack-query/provider.tsx'
import styleCss from '../styles.css?url'

export const Route = createRootRouteWithContext()({
  head: () => ({
    links: [
      { rel: 'stylesheet', href: styleCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }),
  shellComponent: RootComponent,
  notFoundComponent: NotFound,
})

function NotFound() {
  return (
    <div class="min-h-screen bg-background flex items-center justify-center">
      <div class="text-center">
        <h1 class="text-6xl font-bold text-foreground mb-4">404</h1>
        <p class="text-xl text-muted-foreground mb-8">Siden blev ikke fundet</p>
        <a
          href="/"
          class="px-6 py-3 bg-primary hover:bg-wro-blue-600 text-primary-foreground font-semibold rounded-lg transition-colors"
        >
          Gå til forsiden
        </a>
      </div>
    </div>
  )
}

function RootComponent() {
  return (
    <html>
      <head>
        <HeadContent />
        <HydrationScript />
      </head>
      <body>
        <Suspense>
          <TanStackQueryProvider>
            <Header />
            <Outlet />
            <TanStackRouterDevtools />
          </TanStackQueryProvider>
        </Suspense>
        <Scripts />
      </body>
    </html>
  )
}
