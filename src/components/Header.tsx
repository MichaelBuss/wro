import { Link } from '@tanstack/solid-router'

import { For, createSignal } from 'solid-js'
import { Home, Info, Layers, Menu, X } from 'lucide-solid'
import TanStackQueryHeaderUser from '../integrations/tanstack-query/header-user.tsx'
import { INFO_TOPICS } from '~/lib/info-topics'

export default function Header() {
  const [isOpen, setIsOpen] = createSignal(false)
  const [infoExpanded, setInfoExpanded] = createSignal(true)

  return (
    <>
      <header class="p-4 flex items-center bg-wro-blue-950 text-white shadow-lg">
        <button
          onClick={() => setIsOpen(true)}
          class="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <h1 class="ml-4 text-xl font-semibold">
          <Link to="/">
            <img src="/wro-logo.webp" alt="WRO Logo" class="h-10" />
          </Link>
        </h1>
      </header>

      <aside
        class={`fixed top-0 left-0 h-full w-80 bg-gray-900 text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen() ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div class="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 class="text-xl font-bold">Navigation</h2>
          <button
            onClick={() => setIsOpen(false)}
            class="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav class="flex-1 p-4 overflow-y-auto">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              class:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
            }}
          >
            <Home size={20} />
            <span class="font-medium">Forside</span>
          </Link>

          {/* Info Topics Section */}
          <div class="mb-2">
            <button
              onClick={() => setInfoExpanded(!infoExpanded())}
              class="flex items-center justify-between w-full p-3 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <div class="flex items-center gap-3">
                <Info size={20} />
                <span class="font-medium">Information</span>
              </div>
              <svg
                class={`w-4 h-4 transition-transform ${infoExpanded() ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {infoExpanded() && (
              <div class="ml-4 mt-1 space-y-1">
                <For each={INFO_TOPICS}>
                  {(topic) => (
                    <Link
                      to={topic.route}
                      onClick={() => setIsOpen(false)}
                      class="flex items-center gap-3 p-2 pl-4 rounded-lg hover:bg-gray-800 transition-colors text-sm text-gray-300 hover:text-white"
                      activeProps={{
                        class:
                          'flex items-center gap-3 p-2 pl-4 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors text-sm text-white',
                      }}
                    >
                      <span>{topic.shortTitle}</span>
                    </Link>
                  )}
                </For>
              </div>
            )}
          </div>

          <Link
            to="/blog"
            onClick={() => setIsOpen(false)}
            class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              class:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
            }}
          >
            <Layers size={20} />
            <span class="font-medium">Blog</span>
          </Link>
        </nav>

        <div class="p-4 border-t border-gray-700 bg-gray-800 flex flex-col gap-2">
          <TanStackQueryHeaderUser />
        </div>
      </aside>
    </>
  )
}
