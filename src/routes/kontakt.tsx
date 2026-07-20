import { createFileRoute } from '@tanstack/solid-router'
import { Mail, Send } from 'lucide-solid'
import { PageShell } from '~/components/layout'
import { ContentCard, Heading, Lead } from '~/components/ui'

export const Route = createFileRoute('/kontakt')({ component: KontaktPage })

function KontaktPage() {
  return (
    <PageShell size="sm">
      <Heading level="h1" class="mb-4">
        Kontakt
      </Heading>
      <Lead class="text-foreground/70 mb-10">
        Har du spørgsmål om WRO Danmark, tilmelding eller konkurrencen? Skriv
        til os — vi svarer så hurtigt vi kan.
      </Lead>

      <ContentCard class="mb-8">
        <div class="flex items-start gap-4">
          <Mail
            class="w-5 h-5 text-primary/60 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <p class="text-caption text-muted-foreground uppercase tracking-wider mb-1">
              E-mail
            </p>
            <a
              href="mailto:info@wro-denmark.dk"
              class="text-h5 font-medium text-foreground hover:text-primary transition-colors"
            >
              info@wro-denmark.dk
            </a>
          </div>
        </div>

        <p class="text-caption text-muted-foreground mt-6">CVR 46103564</p>
      </ContentCard>

      <ContentCard>
        <div class="flex items-start gap-4 mb-4">
          <Send
            class="w-5 h-5 text-primary/60 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <h2 class="font-sans text-h5 font-medium text-foreground mb-1">
              Nyhedsbrev
            </h2>
            <p class="text-sm-copy text-foreground/70">
              Tilmeld dig vores nyhedsbrev og få besked om vigtige datoer,
              tilmelding og nyt om den danske finale.
            </p>
          </div>
        </div>

        {/* TODO(content): the real newsletter signup URL is unknown, see
          docs/content-todo.md */}
        <a
          href="mailto:info@wro-denmark.dk?subject=Tilmelding%20til%20nyhedsbrev"
          class="inline-flex items-center gap-2 text-sm-copy text-primary hover:underline underline-offset-4 transition-colors"
        >
          Tilmeld dig nyhedsbrevet
        </a>
      </ContentCard>
    </PageShell>
  )
}
