import { For } from 'solid-js'

interface Quote {
  quote: string
  author: string
  team: string
}

interface QuoteListProps {
  quotes: Array<Quote>
}

export function QuoteList(props: QuoteListProps) {
  return (
    <div class="divide-y divide-border">
      <For each={props.quotes}>
        {(item) => (
          <blockquote class="py-6 first:pt-0 last:pb-0">
            <p class="font-serif text-h5 font-normal text-foreground/80 italic mb-3">
              "{item.quote}"
            </p>
            <footer class="text-caption text-muted-foreground">
              <span class="font-sans not-italic font-medium text-foreground/70">
                {item.author}
              </span>
              <span class="ml-2">— {item.team}</span>
            </footer>
          </blockquote>
        )}
      </For>
    </div>
  )
}
