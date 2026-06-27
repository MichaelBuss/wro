import { createFileRoute } from '@tanstack/solid-router'
import { For } from 'solid-js'
import { BackLink, InfoPageLayout, PageHeader } from '~/components/layout'
import { ContentCard } from '~/components/ui'
import { getInfoTopicByRoute } from '~/data/info-topics'

export const Route = createFileRoute('/info/tips')({ component: TipsPage })

function TipsPage() {
  const topic = getInfoTopicByRoute('/info/tips')

  const tips = [
    {
      quote:
        'Start tidligt med at øve. Jo mere tid I bruger på banen, jo bedre bliver I til at forudse problemer.',
      author: 'Marcus, 15 år',
      team: 'Team RoboNinja, finalist 2024',
    },
    {
      quote:
        'Byg robotten så den er nem at reparere. På konkurrencedagen går der altid noget galt, og så skal det gå hurtigt.',
      author: 'Emma, 14 år',
      team: 'Team Circuit Breakers, 2. plads 2023',
    },
    {
      quote:
        'Test, test, test! Og når I tror I er færdige, så test igen. Banen på konkurrencedagen er aldrig 100% som jeres øvebane.',
      author: 'Oliver, 16 år',
      team: 'Team TechTitans, DM-vinder 2024',
    },
    {
      quote:
        'Hav det sjovt! Det vigtigste er at lære noget og møde andre der også synes robotter er seje.',
      author: 'Sofie, 13 år',
      team: 'Team Future Coders, debutant 2024',
    },
  ]

  const practicalTips = [
    {
      title: 'Planlæg jeres tid',
      description:
        'Lav en tidsplan for hvornår I vil øve. 2-3 timer om ugen i 2 måneder er bedre end en hel weekend lige før konkurrencen.',
    },
    {
      title: 'Dokumentér jeres arbejde',
      description:
        'Tag billeder og videoer af jeres robot. Det hjælper jer med at huske hvad der virkede, og er sjovt at se tilbage på.',
    },
    {
      title: 'Lær af fejl',
      description:
        'Når noget går galt, så skriv ned hvad der skete og hvordan I løste det. Samme fejl kommer ofte igen.',
    },
    {
      title: 'Kend reglerne',
      description:
        'Læs konkurrencereglerne grundigt. Der er ofte små detaljer der kan koste point eller diskvalifikation.',
    },
    {
      title: 'Pak en nødkasse',
      description:
        'Hav ekstra dele, værktøj, tape og batterier med til konkurrencen. I vil takke jer selv.',
    },
    {
      title: 'Sov ordentligt',
      description:
        'Natten før konkurrencen skal I sove! En udhvilet hjerne løser problemer meget bedre end en træt.',
    },
  ]

  return (
    <InfoPageLayout>
      <BackLink />
      <PageHeader icon={topic.icon} title={topic.title} />

      <ContentCard class="mb-8">
        <h2 class="font-sans text-h3 font-semibold text-foreground mb-6">
          Hvad siger tidligere deltagere?
        </h2>
        <div class="divide-y divide-border">
          <For each={tips}>
            {(tip) => (
              <blockquote class="py-6 first:pt-0 last:pb-0">
                <p class="font-serif text-h5 font-normal text-foreground/80 italic mb-3">
                  "{tip.quote}"
                </p>
                <footer class="text-caption text-muted-foreground">
                  <span class="font-sans not-italic font-medium text-foreground/70">
                    {tip.author}
                  </span>
                  <span class="ml-2">— {tip.team}</span>
                </footer>
              </blockquote>
            )}
          </For>
        </div>
      </ContentCard>

      <ContentCard>
        <h2 class="font-sans text-h3 font-semibold text-foreground mb-6">
          Praktiske tips
        </h2>
        <div class="divide-y divide-border">
          <For each={practicalTips}>
            {(tip, index) => (
              <div class="flex gap-5 py-5 first:pt-0 last:pb-0">
                <span class="font-serif text-h4 text-muted-foreground/40 tabular-nums shrink-0 w-6 text-right">
                  {index() + 1}
                </span>
                <div>
                  <h3 class="font-sans text-sm-copy font-medium text-foreground mb-1">
                    {tip.title}
                  </h3>
                  <p class="text-sm-copy text-muted-foreground">
                    {tip.description}
                  </p>
                </div>
              </div>
            )}
          </For>
        </div>
      </ContentCard>
    </InfoPageLayout>
  )
}
