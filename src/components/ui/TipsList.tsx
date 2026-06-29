import { For } from 'solid-js'

interface Tip {
  title: string
  description: string
}

interface TipsListProps {
  tips: Array<Tip>
}

export function TipsList(props: TipsListProps) {
  return (
    <div class="divide-y divide-border">
      <For each={props.tips}>
        {(tip, index) => (
          <div class="flex gap-5 py-5 first:pt-0 last:pb-0">
            <span class="font-serif text-h4 text-muted-foreground/40 tabular-nums shrink-0 w-6 text-right">
              {index() + 1}
            </span>
            <div>
              <h3 class="font-sans text-sm-copy font-medium text-foreground mb-1">
                {tip.title}
              </h3>
              <p class="text-sm-copy text-muted-foreground">{tip.description}</p>
            </div>
          </div>
        )}
      </For>
    </div>
  )
}
