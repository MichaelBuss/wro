import { createFileRoute } from '@tanstack/solid-router'
import { createServerFn } from '@tanstack/solid-start'
import { ExternalLink } from 'lucide-solid'
import { For, Show } from 'solid-js'
import { InfoPageLayout } from '~/components/layout'
import { ContentCard } from '~/components/ui'
import { getInfoTopicByRoute } from '~/data/info-topics'
import { getPageContent } from '~/server/content'

const getRulesData = createServerFn({ method: 'GET' }).handler(() =>
  getPageContent('rules'),
)

export const Route = createFileRoute('/info/rules')({
  component: RulesPage,
  loader: () => getRulesData(),
})

function RulesPage() {
  const topic = getInfoTopicByRoute('/info/rules')
  const rules = Route.useLoaderData()

  return (
    <InfoPageLayout icon={topic.icon} title={topic.title}>
      <ContentCard class="mb-8">
        <p class="text-lead text-foreground/70 mb-6">{rules().intro}</p>

        <div class="divide-y divide-border">
          <div class="py-4 first:pt-0">
            <p class="text-caption text-muted-foreground uppercase tracking-wider mb-1">
              Temaet i {new Date().getFullYear()}
            </p>
            <p class="text-h5 font-medium text-foreground">{rules().theme}</p>
          </div>
          <div class="py-4 last:pb-0">
            <p class="text-caption text-muted-foreground uppercase tracking-wider mb-1">
              Hold og aldersgrupper
            </p>
            <p class="text-sm-copy text-foreground/70">{rules().overview}</p>
          </div>
        </div>
      </ContentCard>

      <div class="space-y-8">
        <For each={rules().categories}>
          {(category) => (
            <ContentCard>
              <h2 class="font-sans text-h3 font-semibold text-foreground mb-2">
                {category.name}
              </h2>
              <p class="text-sm-copy text-foreground/70 mb-6">
                {category.description}
              </p>

              <div class="divide-y divide-border">
                <For each={category.material_groups}>
                  {(group) => (
                    <div class="py-5 first:pt-0 last:pb-0">
                      <Show when={group.heading}>
                        {(heading) => (
                          <h3 class="text-sm-copy font-medium text-foreground mb-3">
                            {heading()}
                          </h3>
                        )}
                      </Show>

                      <div class="space-y-2">
                        <For each={group.materials}>
                          {(material) => (
                            <Show
                              when={material.url}
                              fallback={
                                <div class="flex items-center justify-between gap-4 text-sm-copy">
                                  <span class="text-foreground/70">
                                    {material.label}
                                  </span>
                                  <span class="text-caption text-muted-foreground uppercase tracking-wider shrink-0">
                                    Kommer snart
                                  </span>
                                </div>
                              }
                            >
                              {(url) => (
                                <a
                                  href={url()}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  class="flex items-center gap-2 text-sm-copy text-primary hover:underline underline-offset-4 transition-colors"
                                >
                                  <span>{material.label}</span>
                                  <ExternalLink size={14} class="shrink-0" />
                                </a>
                              )}
                            </Show>
                          )}
                        </For>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </ContentCard>
          )}
        </For>
      </div>

      <div class="mt-8 border border-border rounded-lg p-6">
        <h3 class="font-sans text-h5 font-medium text-foreground mb-3">
          Internationale regler
        </h3>
        <p class="text-sm-copy text-muted-foreground mb-4">
          De danske regler følger WROs officielle internationale regelsæt for
          sæsonen.
        </p>
        <a
          href={rules().international_url}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 text-sm-copy text-primary hover:underline underline-offset-4 transition-colors"
        >
          <span>Se internationale regler</span>
          <ExternalLink size={14} />
        </a>
      </div>
    </InfoPageLayout>
  )
}
