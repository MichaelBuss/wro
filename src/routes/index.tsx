import { createFileRoute } from '@tanstack/solid-router'
import { For } from 'solid-js'
import {
  Route as RouteIcon,
  Server,
  Shield,
  Sparkles,
  Waves,
  Zap,
} from 'lucide-solid'
import { CONSTANTS } from '~/lib/constants'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const features = [
    {
      icon: <Zap class="w-12 h-12 text-cyan-400" />,
      title: 'Hvad kan man vinde?',
      description: `Hovedpremien er en fuldtbetalt rejse til WRO-verdensfinalen som i år afholdes i ${CONSTANTS.WORLD_FINAL_LOCATION}.`,
    },
    {
      icon: <Server class="w-12 h-12 text-cyan-400" />,
      title: 'Hvornår afholdes den danske finale?',
      description: `Den danske finale afholdes ${CONSTANTS.DANISH_FINAL_DATE.toLocaleDateString('da-DK', { day: '2-digit', month: '2-digit', year: 'numeric' })} på ${CONSTANTS.DANISH_FINAL_LOCATION}.`,
    },
    {
      icon: <RouteIcon class="w-12 h-12 text-cyan-400" />,
      title: 'Hvad skal man bruge for at deltage?',
      description:
        'Du skal bruge et robotsæt og byggematerialer. De fleste bruger LEGO EV3 eller Spike Prime. Se mere om hvilke materialer der er tilladte her: https://wro-association.org/competition/2025-season/',
    },
    {
      icon: <Shield class="w-12 h-12 text-cyan-400" />,
      title: 'Hvad koster det at deltage?',
      description: 'Man skal kun betale for en øve-bane',
    },
    {
      icon: <Waves class="w-12 h-12 text-cyan-400" />,
      title: 'Gode råd fra tidligere deltagere',
      description:
        'Stream data from server to client progressively. Perfect for AI applications and real-time updates.',
    },
    {
      icon: <Sparkles class="w-12 h-12 text-cyan-400" />,
      title: 'Andre online ressourcer',
      description:
        'Built from the ground up for modern web applications. Deploy anywhere JavaScript runs.',
    },
  ]

  return (
    <div class="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <section class="relative py-20 px-6 text-center overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10"></div>
        <div class="relative max-w-5xl mx-auto">
          <div class="flex items-center justify-center gap-6 mb-6">
            <img
              src="/tanstack-circle-logo.png"
              alt="TanStack Logo"
              class="w-24 h-24 md:w-32 md:h-32"
            />
            <h1 class="text-6xl md:text-7xl font-black text-white [letter-spacing:-0.08em]">
              <span class="text-gray-300">TANSTACK</span>{' '}
              <span class="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                START
              </span>
            </h1>
          </div>
          <p class="text-2xl md:text-3xl text-gray-300 mb-4 font-light">
            The framework for next generation AI applications
          </p>
          <p class="text-lg text-gray-400 max-w-3xl mx-auto mb-8">
            Full-stack framework powered by TanStack Router for React and Solid.
            Build modern applications with server functions, streaming, and type
            safety.
          </p>
          <div class="flex flex-col items-center gap-4">
            <a
              href="https://tanstack.com/start"
              target="_blank"
              rel="noopener noreferrer"
              class="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-cyan-500/50"
            >
              Documentation
            </a>
            <p class="text-gray-400 text-sm mt-2">
              Begin your TanStack Start journey by editing{' '}
              <code class="px-2 py-1 bg-slate-700 rounded text-cyan-400">
                /src/routes/index.tsx
              </code>
            </p>
          </div>
        </div>
      </section>

      <section class="py-16 px-6 max-w-7xl mx-auto">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <For each={features}>
            {(feature) => (
              <div class="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10">
                <div class="mb-4">{feature.icon}</div>
                <h3 class="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p class="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            )}
          </For>
        </div>
      </section>
    </div>
  )
}
