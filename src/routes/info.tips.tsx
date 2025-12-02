import { Link, createFileRoute } from '@tanstack/solid-router'
import { ArrowLeft, Quote } from 'lucide-solid'
import { For } from "solid-js";
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

        <div class="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 mb-8">
          <h2 class="text-2xl font-semibold text-white mb-6">
            Hvad siger tidligere deltagere?
          </h2>

          <div class="grid gap-6">
            <For each={tips}>{(tip) => (
              <div class="p-6 bg-slate-700/50 rounded-lg border-l-4 border-cyan-500">
                <div class="flex gap-3">
                  <Quote class="w-6 h-6 text-cyan-400 flex-shrink-0 mt-1" />
                  <div>
                    <p class="text-gray-300 text-lg italic mb-3">
                      "{tip.quote}"
                    </p>
                    <div class="text-sm">
                      <span class="text-white font-medium">{tip.author}</span>
                      <span class="text-gray-500 ml-2">— {tip.team}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}</For>
          </div>
        </div>

        <div class="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8">
          <h2 class="text-2xl font-semibold text-white mb-6">Praktiske tips</h2>

          <div class="grid md:grid-cols-2 gap-4">
            {practicalTips.map((tip, index) => (
              <div class="p-4 bg-slate-700/30 rounded-lg">
                <div class="flex items-start gap-3">
                  <span class="text-2xl font-bold text-cyan-400/50">
                    {index + 1}
                  </span>
                  <div>
                    <h3 class="text-white font-medium mb-1">{tip.title}</h3>
                    <p class="text-gray-400 text-sm">{tip.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
