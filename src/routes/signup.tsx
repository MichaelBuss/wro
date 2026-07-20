import { createFileRoute } from '@tanstack/solid-router'
import { createServerFn } from '@tanstack/solid-start'
import { Calendar, ExternalLink, MapPin, Users } from 'lucide-solid'
import { For } from 'solid-js'
import { PageShell } from '~/components/layout'
import { ContentCard, Heading, Lead, TipBox } from '~/components/ui'
import {
  OPEN_CHAMPIONSHIPS,
  OPEN_CHAMPIONSHIP_INTEREST_DEADLINE,
} from '~/data/constants'
import { getPageContent } from '~/server/content'

const getSignupData = createServerFn({ method: 'GET' }).handler(() => ({
  eventInfo: getPageContent('event-info'),
  rules: getPageContent('rules'),
}))

export const Route = createFileRoute('/signup')({
  component: SignupPage,
  loader: () => getSignupData(),
})

function SignupPage() {
  const data = Route.useLoaderData()

  const formattedDate = () =>
    data().eventInfo.danish_final_date.toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  return (
    <PageShell size="md">
      <Heading level="h1" class="mb-4">
        Tilmelding
      </Heading>
      <Lead class="text-foreground/70 mb-10">
        Tilmeld dit hold til den danske finale, eller vis interesse for en af
        WROs internationale Open Championships.
      </Lead>

      <ContentCard class="mb-8">
        <h2 class="font-sans text-h3 font-semibold text-foreground mb-6">
          Dansk finale {data().eventInfo.danish_final_date.getFullYear()}
        </h2>

        <div class="divide-y divide-border mb-6">
          <div class="flex items-start gap-4 py-4 first:pt-0">
            <Calendar class="w-5 h-5 text-primary/60 shrink-0 mt-0.5" />
            <div>
              <p class="text-caption text-muted-foreground uppercase tracking-wider mb-1">
                Dato & sted
              </p>
              <p class="text-sm-copy text-foreground/70">
                {formattedDate()} — {data().eventInfo.danish_final_location}
              </p>
            </div>
          </div>

          <div class="flex items-start gap-4 py-4 last:pb-0">
            <Users class="w-5 h-5 text-primary/60 shrink-0 mt-0.5" />
            <div>
              <p class="text-caption text-muted-foreground uppercase tracking-wider mb-1">
                Hold
              </p>
              <p class="text-sm-copy text-foreground/70">
                {data().rules.overview}
              </p>
            </div>
          </div>
        </div>

        <p class="text-sm-copy text-foreground/70 mb-6">
          Deltagelse i den danske finale er <strong>gratis</strong>. Hold kan
          deltage i{' '}
          {data()
            .rules.categories.map((c) => c.name)
            .join(' eller ')}
          .
        </p>

        {/* TODO(content): the real Danish-final registration link/form is
          unknown, see docs/content-todo.md */}
        <a
          href="/kontakt"
          class="inline-flex items-center justify-center gap-2 h-11 px-8 bg-primary text-primary-foreground font-medium rounded-md hover:bg-wro-blue-600 transition-colors"
        >
          Kontakt os for at tilmelde dit hold
        </a>
      </ContentCard>

      <ContentCard class="mb-8">
        <h2 class="font-sans text-h3 font-semibold text-foreground mb-2">
          Open Championships
        </h2>
        <p class="text-sm-copy text-foreground/70 mb-6">
          Ud over den danske finale afholder WRO Association en række
          internationale Open Championships. Interessetilmelding sker direkte
          hos WRO Association, med frist{' '}
          <strong>{OPEN_CHAMPIONSHIP_INTEREST_DEADLINE}</strong>.
        </p>

        <div class="divide-y divide-border">
          <For each={OPEN_CHAMPIONSHIPS}>
            {(championship) => (
              <div class="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div>
                  <h3 class="text-sm-copy font-medium text-foreground mb-1">
                    {championship.region}
                  </h3>
                  <p class="text-caption text-muted-foreground flex items-center gap-1.5">
                    <MapPin size={12} class="shrink-0" />
                    {championship.location}
                  </p>
                </div>
                <span class="text-caption text-muted-foreground tabular-nums shrink-0">
                  {championship.dates}
                </span>
              </div>
            )}
          </For>
        </div>

        <a
          href={data().rules.international_url}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 text-sm-copy text-primary hover:underline underline-offset-4 transition-colors mt-6"
        >
          <span>Se Open Championships hos WRO Association</span>
          <ExternalLink size={14} />
        </a>
      </ContentCard>

      <TipBox title="Har du spørgsmål om tilmelding?">
        Skriv til os på{' '}
        <a
          href="mailto:info@wro-denmark.dk"
          class="underline underline-offset-4"
        >
          info@wro-denmark.dk
        </a>{' '}
        — vi hjælper gerne med tilmelding og praktiske spørgsmål.
      </TipBox>
    </PageShell>
  )
}
