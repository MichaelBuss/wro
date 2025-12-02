import { Link, createFileRoute } from '@tanstack/solid-router'
import { ArrowLeft, Book, Code, ExternalLink, Users, Video } from 'lucide-solid'
import { For } from "solid-js";
import { getInfoTopicByRoute } from '~/data/info-topics'

export const Route = createFileRoute('/info/resources')({
  component: ResourcesPage,
})

function ResourcesPage() {
  const topic = getInfoTopicByRoute('/info/resources')

  const resourceCategories = [
    {
      title: 'Officielle WRO ressourcer',
      icon: <Book class="w-6 h-6 text-cyan-400" />,
      resources: [
        {
          name: 'WRO Association',
          url: 'https://wro-association.org',
          description:
            'Den internationale WRO organisation med regler, nyheder og information.',
        },
        {
          name: 'WRO 2025 Season',
          url: 'https://wro-association.org/competition/2025-season/',
          description: 'Alt om årets konkurrence, temaer og regler.',
        },
        {
          name: 'WRO Danmark',
          url: 'https://wro.dk',
          description:
            'Den danske WRO hjemmeside med lokale nyheder og events.',
        },
      ],
    },
    {
      title: 'Programmering',
      icon: <Code class="w-6 h-6 text-green-400" />,
      resources: [
        {
          name: 'SPIKE Prime App',
          url: 'https://education.lego.com/en-us/downloads/spike-app/software/',
          description:
            'Officielt programmeringsmiljø til LEGO SPIKE Prime robotter.',
        },
        {
          name: 'EV3 Classroom',
          url: 'https://education.lego.com/en-us/downloads/mindstorms-ev3/software/',
          description: 'Programmeringssoftware til LEGO Mindstorms EV3.',
        },
        {
          name: 'Pybricks',
          url: 'https://pybricks.com',
          description:
            'Python-baseret programmering til LEGO robotter - for de mere avancerede.',
        },
      ],
    },
    {
      title: 'Video tutorials',
      icon: <Video class="w-6 h-6 text-red-400" />,
      resources: [
        {
          name: 'LEGO Education YouTube',
          url: 'https://www.youtube.com/@LEGOeducation',
          description:
            'Officielle tutorials og inspiration fra LEGO Education.',
        },
        {
          name: 'Builderdude35',
          url: 'https://www.youtube.com/@Builderdude35',
          description:
            'Fantastiske robot builds og mekanismer forklaret trin-for-trin.',
        },
        {
          name: 'FIRST Scandinavia',
          url: 'https://www.youtube.com/@FIRSTScandinavia',
          description: 'Videoer fra nordiske robotkonkurrencer og tutorials.',
        },
      ],
    },
    {
      title: 'Communities',
      icon: <Users class="w-6 h-6 text-purple-400" />,
      resources: [
        {
          name: 'LEGO Education Community',
          url: 'https://community.legoeducation.com',
          description: 'Forum for LEGO Education brugere verden over.',
        },
        {
          name: 'Reddit r/FLL',
          url: 'https://www.reddit.com/r/FLL/',
          description:
            'Aktivt community for robotkonkurrencer (primært FIRST LEGO League).',
        },
        {
          name: 'EV3DEV',
          url: 'https://www.ev3dev.org',
          description:
            'Community for avanceret EV3 programmering med Python og Linux.',
        },
      ],
    },
  ]

  return (
    <div class="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <section class="py-16 px-6 max-w-4xl mx-auto">
        <Link
          to="/"
          class="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors mb-8"
        >
          <ArrowLeft size={20} />
          <span>Tilbage til forsiden</span>
        </Link>

        <div class="flex items-center gap-4 mb-8">
          {topic.icon}
          <h1 class="text-4xl md:text-5xl font-bold text-white">
            <span class="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {topic.title}
            </span>
          </h1>
        </div>

        <p class="text-xl text-gray-300 mb-8">{topic.description}</p>

        <div class="space-y-8">
          <For each={resourceCategories}>{(category) => (
            <div class="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <div class="flex items-center gap-3 mb-6">
                {category.icon}
                <h2 class="text-xl font-semibold text-white">
                  {category.title}
                </h2>
              </div>

              <div class="grid gap-4">
                <For each={category.resources}>{(resource) => (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="block p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors group"
                  >
                    <div class="flex items-start justify-between">
                      <div>
                        <h3 class="text-white font-medium group-hover:text-cyan-400 transition-colors flex items-center gap-2">
                          {resource.name}
                          <ExternalLink
                            size={14}
                            class="opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </h3>
                        <p class="text-gray-400 text-sm mt-1">
                          {resource.description}
                        </p>
                      </div>
                    </div>
                  </a>
                )}</For>
              </div>
            </div>
          )}</For>
        </div>

        <div class="mt-8 p-6 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
          <h3 class="text-lg font-semibold text-cyan-400 mb-3">
            💡 Har du et godt tip?
          </h3>
          <p class="text-gray-300">
            Kender du en god ressource som mangler på listen? Kontakt os og del
            dit fund med andre WRO-deltagere!
          </p>
        </div>
      </section>
    </div>
  )
}
