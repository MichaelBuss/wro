import { createFileRoute } from '@tanstack/solid-router'
import { Hammer, Package, Ruler } from 'lucide-solid'
import { PageShell } from '~/components/layout'
import { ContentCard, Heading, Lead, TipBox } from '~/components/ui'

export const Route = createFileRoute('/order-a-track')({
  component: OrderATrackPage,
})

function OrderATrackPage() {
  return (
    <PageShell size="sm">
      <Heading level="h1" class="mb-4">
        Bestil en bane
      </Heading>
      <Lead class="text-foreground/70 mb-10">
        For at øve op til konkurrencen skal I bruge en øvebane, der matcher det
        officielle banelayout. I kan bestille en færdig bane eller lave jeres
        egen.
      </Lead>

      <ContentCard class="mb-8">
        <div class="flex items-start gap-4 mb-4">
          <Package
            class="w-5 h-5 text-primary/60 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <h2 class="font-sans text-h5 font-medium text-foreground mb-1">
              Bestil en bane
            </h2>
            <p class="text-sm-copy text-foreground/70">
              Baner koster typisk ~500–800 kr og kan bestilles til levering
              hjemme eller på skolen.
            </p>
          </div>
        </div>

        {/* TODO(content): the real order URL/process for track mats is
          unknown, see docs/content-todo.md */}
        <a
          href="mailto:info@wro-denmark.dk?subject=Bestilling%20af%20bane"
          class="inline-flex items-center justify-center gap-2 h-11 px-8 bg-primary text-primary-foreground font-medium rounded-md hover:bg-wro-blue-600 transition-colors"
        >
          Kontakt os for at bestille en bane
        </a>
      </ContentCard>

      <ContentCard class="mb-8">
        <div class="flex items-start gap-4">
          <Hammer
            class="w-5 h-5 text-primary/60 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <h2 class="font-sans text-h5 font-medium text-foreground mb-1">
              Lav den selv
            </h2>
            <p class="text-sm-copy text-foreground/70">
              I kan også lave jeres egen øvebane, hvis I hellere vil spare
              udgiften. Følg de officielle mål og markeringer fra konkurrencens
              regler, så banen matcher den I møder til finalen.
            </p>
          </div>
        </div>
      </ContentCard>

      <TipBox title="Del en bane med et andet hold">
        <span class="flex items-start gap-2">
          <Ruler class="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          Mange hold går sammen om at dele en øvebane, f.eks. med et andet hold
          på skolen. Spørg jeres naturfagslærer eller IT-ansvarlige, om skolen
          allerede har en.
        </span>
      </TipBox>
    </PageShell>
  )
}
