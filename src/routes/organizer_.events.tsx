import {
  Link,
  createFileRoute,
  redirect,
  useRouter,
} from '@tanstack/solid-router'
import { For, Show, createSignal, untrack } from 'solid-js'
import { z } from 'zod'
import { PageShell } from '~/components/layout'
import { Button, Heading } from '~/components/ui'
import { decideOrganizerAccess, getSessionWithRole } from '~/lib/auth-functions'
import {
  createCategoryFn,
  createEventFn,
  exportEventRegistrationsCsvFn,
  listEventsWithCategoriesFn,
  removeCategoryFn,
  updateCategoryFn,
  updateEventFn,
} from '~/lib/organizer-functions'
import type { EventWithCategories } from '~/lib/organizer-functions'
import { eventKinds } from '~/server/db/schema'
import type { CategoryRow, EventRow } from '~/server/db/schema'

const eventKindSchema = z.enum(eventKinds)

export const Route = createFileRoute('/organizer_/events')({
  beforeLoad: async () => {
    const session = await getSessionWithRole()
    const access = decideOrganizerAccess(session?.user)

    if (access.type === 'redirect') {
      throw redirect({ to: access.to })
    }

    return { user: access.user }
  },
  loader: async () => {
    const eventsWithCategories = await listEventsWithCategoriesFn()
    return { eventsWithCategories }
  },
  component: OrganizerEvents,
})

function kindLabel(kind: (typeof eventKinds)[number]) {
  return kind === 'competition' ? 'Konkurrence' : 'Samling'
}

function formatDeadline(deadline: string | Date | null) {
  if (!deadline) return null
  const d = new Date(deadline)
  return d.toLocaleDateString('da-DK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function toDatetimeLocalValue(d: Date | null): string {
  if (!d) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ---------------------------------------------------------------------------
// Create Event form
// ---------------------------------------------------------------------------

interface CreateEventFormProps {
  onDone: () => void
}

function CreateEventForm(props: CreateEventFormProps) {
  const router = useRouter()
  const [name, setName] = createSignal('')
  const [kind, setKind] =
    createSignal<(typeof eventKinds)[number]>('competition')
  const [deadline, setDeadline] = createSignal('')
  const [saving, setSaving] = createSignal(false)

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const dl = deadline().trim()
      await createEventFn({
        data: {
          name: name().trim(),
          kind: kind(),
          registrationDeadline: dl ? new Date(dl).toISOString() : null,
        },
      })
      await router.invalidate()
      props.onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      class="space-y-3 rounded-lg border border-border bg-muted/30 p-4"
    >
      <Heading level="h3">Opret begivenhed</Heading>
      <div>
        <label class="block text-sm font-medium mb-1">
          Navn <span class="text-destructive">*</span>
        </label>
        <input
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
          placeholder="WRO Denmark 2027"
          required
          maxLength={200}
        />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Type</label>
        <select
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={kind()}
          onChange={(e) =>
            setKind(eventKindSchema.parse(e.currentTarget.value))
          }
        >
          <option value="competition">Konkurrence</option>
          <option value="gathering">Samling</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">
          Tilmeldingsfrist{' '}
          <span class="text-muted-foreground text-xs">(valgfri)</span>
        </label>
        <input
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          type="datetime-local"
          value={deadline()}
          onInput={(e) => setDeadline(e.currentTarget.value)}
        />
      </div>
      <div class="flex gap-2">
        <Button type="submit" size="sm" disabled={saving()}>
          {saving() ? 'Gemmer…' : 'Opret'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={props.onDone}>
          Annuller
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Edit Event form (inline)
// ---------------------------------------------------------------------------

interface EditEventFormProps {
  event: EventRow
  onDone: () => void
}

function EditEventForm(props: EditEventFormProps) {
  const router = useRouter()
  const [name, setName] = createSignal(untrack(() => props.event.name))
  const [kind, setKind] = createSignal<(typeof eventKinds)[number]>(
    untrack(() => props.event.kind),
  )
  const [deadline, setDeadline] = createSignal(
    untrack(() => toDatetimeLocalValue(props.event.registrationDeadline)),
  )
  const [saving, setSaving] = createSignal(false)

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const dl = deadline().trim()
      await updateEventFn({
        data: {
          eventId: props.event.id,
          name: name().trim(),
          kind: kind(),
          registrationDeadline: dl ? new Date(dl).toISOString() : null,
        },
      })
      await router.invalidate()
      props.onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} class="space-y-3">
      <div>
        <label class="block text-sm font-medium mb-1">
          Navn <span class="text-destructive">*</span>
        </label>
        <input
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
          required
          maxLength={200}
        />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Type</label>
        <select
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={kind()}
          onChange={(e) =>
            setKind(eventKindSchema.parse(e.currentTarget.value))
          }
        >
          <option value="competition">Konkurrence</option>
          <option value="gathering">Samling</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">
          Tilmeldingsfrist{' '}
          <span class="text-muted-foreground text-xs">(valgfri)</span>
        </label>
        <input
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          type="datetime-local"
          value={deadline()}
          onInput={(e) => setDeadline(e.currentTarget.value)}
        />
      </div>
      <div class="flex gap-2">
        <Button type="submit" size="sm" disabled={saving()}>
          {saving() ? 'Gemmer…' : 'Gem'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={props.onDone}>
          Annuller
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Create Category form
// ---------------------------------------------------------------------------

interface CreateCategoryFormProps {
  eventId: string
  onDone: () => void
}

function CreateCategoryForm(props: CreateCategoryFormProps) {
  const router = useRouter()
  const [name, setName] = createSignal('')
  const [minYear, setMinYear] = createSignal('')
  const [maxYear, setMaxYear] = createSignal('')
  const [saving, setSaving] = createSignal(false)

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const min = minYear().trim()
      const max = maxYear().trim()
      await createCategoryFn({
        data: {
          eventId: props.eventId,
          name: name().trim(),
          minBirthYear: min ? parseInt(min, 10) : null,
          maxBirthYear: max ? parseInt(max, 10) : null,
        },
      })
      await router.invalidate()
      props.onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      class="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/30 p-3"
    >
      <div class="flex-1 min-w-32">
        <label class="block text-xs font-medium mb-1">
          Navn <span class="text-destructive">*</span>
        </label>
        <input
          class="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
          placeholder="RoboMission Junior"
          required
          maxLength={200}
        />
      </div>
      <div class="w-28">
        <label class="block text-xs font-medium mb-1">
          Min. fødselsår <span class="text-muted-foreground">(valgfri)</span>
        </label>
        <input
          class="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          type="number"
          min={1900}
          max={2100}
          value={minYear()}
          onInput={(e) => setMinYear(e.currentTarget.value)}
          placeholder="2011"
        />
      </div>
      <div class="w-28">
        <label class="block text-xs font-medium mb-1">
          Maks. fødselsår <span class="text-muted-foreground">(valgfri)</span>
        </label>
        <input
          class="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          type="number"
          min={1900}
          max={2100}
          value={maxYear()}
          onInput={(e) => setMaxYear(e.currentTarget.value)}
          placeholder="2015"
        />
      </div>
      <div class="flex gap-2 items-end">
        <Button type="submit" size="sm" disabled={saving()}>
          {saving() ? 'Gemmer…' : 'Tilføj'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={props.onDone}>
          Annuller
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Edit Category form (inline)
// ---------------------------------------------------------------------------

interface EditCategoryFormProps {
  category: CategoryRow
  onDone: () => void
}

function EditCategoryForm(props: EditCategoryFormProps) {
  const router = useRouter()
  const [name, setName] = createSignal(untrack(() => props.category.name))
  const [minYear, setMinYear] = createSignal(
    untrack(() =>
      props.category.minBirthYear != null
        ? String(props.category.minBirthYear)
        : '',
    ),
  )
  const [maxYear, setMaxYear] = createSignal(
    untrack(() =>
      props.category.maxBirthYear != null
        ? String(props.category.maxBirthYear)
        : '',
    ),
  )
  const [saving, setSaving] = createSignal(false)

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const min = minYear().trim()
      const max = maxYear().trim()
      await updateCategoryFn({
        data: {
          categoryId: props.category.id,
          name: name().trim(),
          minBirthYear: min ? parseInt(min, 10) : null,
          maxBirthYear: max ? parseInt(max, 10) : null,
        },
      })
      await router.invalidate()
      props.onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      class="flex flex-wrap items-end gap-2"
    >
      <div class="flex-1 min-w-32">
        <input
          class="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
          required
          maxLength={200}
        />
      </div>
      <div class="w-24">
        <input
          class="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          type="number"
          min={1900}
          max={2100}
          value={minYear()}
          onInput={(e) => setMinYear(e.currentTarget.value)}
          placeholder="Min år"
        />
      </div>
      <div class="w-24">
        <input
          class="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          type="number"
          min={1900}
          max={2100}
          value={maxYear()}
          onInput={(e) => setMaxYear(e.currentTarget.value)}
          placeholder="Maks år"
        />
      </div>
      <div class="flex gap-2">
        <Button type="submit" size="sm" disabled={saving()}>
          {saving() ? '…' : 'Gem'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={props.onDone}>
          Annuller
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Event card (with its categories)
// ---------------------------------------------------------------------------

interface EventCardProps {
  entry: EventWithCategories
}

function EventCard(props: EventCardProps) {
  const router = useRouter()
  const [editingEvent, setEditingEvent] = createSignal(false)
  const [addingCategory, setAddingCategory] = createSignal(false)
  const [editingCategoryId, setEditingCategoryId] = createSignal<string | null>(
    null,
  )
  const [downloading, setDownloading] = createSignal(false)

  async function handleDownloadCsv() {
    setDownloading(true)
    try {
      const result = await exportEventRegistrationsCsvFn({
        data: { eventId: props.entry.event.id },
      })
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeName = props.entry.event.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      a.download = `registreringer-${safeName}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  async function handleRemoveCategory(categoryId: string) {
    await removeCategoryFn({ data: { categoryId } })
    await router.invalidate()
  }

  return (
    <div class="rounded-lg border border-border bg-card">
      {/* Event header */}
      <div class="px-5 py-4 border-b border-border">
        <Show
          when={editingEvent()}
          fallback={
            <div class="flex flex-wrap items-start gap-3">
              <div class="flex-1">
                <p class="font-semibold text-base">{props.entry.event.name}</p>
                <p class="text-sm text-muted-foreground mt-0.5">
                  {kindLabel(props.entry.event.kind)}
                  <Show when={props.entry.event.registrationDeadline}>
                    {' · Frist: '}
                    {formatDeadline(props.entry.event.registrationDeadline)}
                  </Show>
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={downloading()}
                onClick={() => void handleDownloadCsv()}
              >
                {downloading() ? 'Henter…' : 'Download CSV'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingEvent(true)}
              >
                Redigér
              </Button>
            </div>
          }
        >
          <EditEventForm
            event={props.entry.event}
            onDone={() => setEditingEvent(false)}
          />
        </Show>
      </div>

      {/* Categories section */}
      <div class="px-5 py-4">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm font-medium">Kategorier</p>
          <Show when={!addingCategory()}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAddingCategory(true)}
            >
              + Tilføj kategori
            </Button>
          </Show>
        </div>

        <Show when={props.entry.event.kind === 'gathering'}>
          <p class="text-xs text-muted-foreground mb-3">
            Samlings-begivenheder bruger ikke kategorier (RSVP/antal).
          </p>
        </Show>

        <Show
          when={props.entry.categories.length > 0}
          fallback={
            <p class="text-sm text-muted-foreground">Ingen kategorier endnu.</p>
          }
        >
          <ul class="space-y-2">
            <For each={props.entry.categories}>
              {(cat) => (
                <li class="rounded-md border border-border px-3 py-2">
                  <Show
                    when={editingCategoryId() === cat.id}
                    fallback={
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="flex-1 text-sm font-medium">
                          {cat.name}
                        </span>
                        <span class="text-xs text-muted-foreground">
                          <Show
                            when={
                              cat.minBirthYear != null ||
                              cat.maxBirthYear != null
                            }
                            fallback="Ingen aldersbegrænsning"
                          >
                            f. {cat.minBirthYear ?? '—'} –{' '}
                            {cat.maxBirthYear ?? '—'}
                          </Show>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCategoryId(cat.id)
                          }}
                        >
                          Redigér
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleRemoveCategory(cat.id)}
                        >
                          Fjern
                        </Button>
                      </div>
                    }
                  >
                    <EditCategoryForm
                      category={cat}
                      onDone={() => setEditingCategoryId(null)}
                    />
                  </Show>
                </li>
              )}
            </For>
          </ul>
        </Show>

        <Show when={addingCategory()}>
          <div class="mt-3">
            <CreateCategoryForm
              eventId={props.entry.event.id}
              onDone={() => setAddingCategory(false)}
            />
          </div>
        </Show>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

function OrganizerEvents() {
  const loaderData = Route.useLoaderData()
  const [showCreateEvent, setShowCreateEvent] = createSignal(false)

  return (
    <PageShell size="lg">
      <div class="mb-6 flex items-center gap-3">
        <Link
          to="/organizer"
          class="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Tilbage til arrangør-panel
        </Link>
      </div>

      <div class="mb-6 flex items-start justify-between gap-4">
        <Heading level="h1">Begivenheder &amp; kategorier</Heading>
        <Show when={!showCreateEvent()}>
          <Button type="button" onClick={() => setShowCreateEvent(true)}>
            + Ny begivenhed
          </Button>
        </Show>
      </div>

      <Show when={showCreateEvent()}>
        <div class="mb-6">
          <CreateEventForm onDone={() => setShowCreateEvent(false)} />
        </div>
      </Show>

      <Show
        when={loaderData().eventsWithCategories.length > 0}
        fallback={
          <p class="text-sm text-muted-foreground">
            Ingen begivenheder oprettet endnu.
          </p>
        }
      >
        <div class="space-y-6">
          <For each={loaderData().eventsWithCategories}>
            {(entry) => <EventCard entry={entry} />}
          </For>
        </div>
      </Show>
    </PageShell>
  )
}
