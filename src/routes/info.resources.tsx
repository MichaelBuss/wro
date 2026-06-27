import { createFileRoute } from '@tanstack/solid-router'
import { Book, Code, ExternalLink, Users, Video } from 'lucide-solid'
import { For } from 'solid-js'
import { BackLink, InfoPageLayout, PageHeader } from '~/components/layout'
import { ContentCard, TipBox } from '~/components/ui'
import { getInfoTopicByRoute } from '~/data/info-topics'

export const Route = createFileRoute('/info/resources')({
  component: ResourcesPage,
})

function ResourcesPage() {
  const topic = getInfoTopicByRoute('/info/resources')

  const resourceCategories = [
    {
      title: 'Officielle WRO ressourcer',
      icon: <Book class="w-6 h-6 text-wro-blue-500" />,
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
      ],
    },
    {
      title: 'Programmering',
      icon: <Code class="w-6 h-6 text-green-600" />,
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
      icon: <Video class="w-6 h-6 text-red-500" />,
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
      icon: <Users class="w-6 h-6 text-purple-600" />,
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
    <InfoPageLayout>
      <BackLink />
      <PageHeader icon={topic.icon} title={topic.title} />

      <p class="text-xl text-muted-foreground mb-8">{topic.description}</p>

      <div class="space-y-8">
        <For each={resourceCategories}>
          {(category) => (
            <ContentCard>
              <div class="flex items-center gap-3 mb-6">
                {category.icon}
                <h2 class="text-xl font-semibold text-foreground">
                  {category.title}
                </h2>
              </div>

              <div class="grid gap-4">
                <For each={category.resources}>
                  {(resource) => (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="block p-4 bg-muted rounded-lg hover:bg-muted/70 transition-colors group"
                    >
                      <div class="flex items-start justify-between">
                        <div>
                          <h3 class="text-foreground font-medium group-hover:text-wro-blue-600 transition-colors flex items-center gap-2">
                            {resource.name}
                            <ExternalLink
                              size={14}
                              class="opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                          </h3>
                          <p class="text-muted-foreground text-sm mt-1">
                            {resource.description}
                          </p>
                        </div>
                      </div>
                    </a>
                  )}
                </For>
              </div>
            </ContentCard>
          )}
        </For>
      </div>

      <TipBox title="💡 Har du et godt tip?" class="mt-8">
        Kender du en god ressource som mangler på listen? Kontakt os og del dit
        fund med andre WRO-deltagere!
      </TipBox>
    </InfoPageLayout>
  )
}
