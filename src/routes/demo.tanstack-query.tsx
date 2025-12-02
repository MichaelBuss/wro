import { createQuery } from '@tanstack/solid-query'
import { createFileRoute } from '@tanstack/solid-router'
import { For } from "solid-js";

export const Route = createFileRoute('/demo/tanstack-query')({
  component: App,
})

function App() {
  const peopleQuery = createQuery(() => ({
    queryKey: ['people'],
    queryFn: () =>
      Promise.resolve([{ name: 'John Doe' }, { name: 'Jane Doe' }]),
    initialData: [],
  }))

  return (
    <div class="p-4">
      <h1 class="text-2xl mb-4">People list from Swapi</h1>
      <ul>
        <For each={peopleQuery.data}>{(person) => (
          <li>{person.name}</li>
        )}</For>
      </ul>
    </div>
  )
}

export default App
