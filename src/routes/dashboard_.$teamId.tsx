import { Link, createFileRoute, redirect, useRouter } from '@tanstack/solid-router'
import { For, Show, createSignal } from 'solid-js'
import { PageShell } from '~/components/layout'
import { Button, Heading } from '~/components/ui'
import { checkAgeBandEligibility } from '~/lib/age-band'
import { getSession } from '~/lib/auth-functions'
import { decideDashboardAccess } from '~/lib/dashboard-access'
import {
  addParticipantFn,
  getTeamDetailsFn,
  listAllCategoriesFn,
  removeParticipantFn,
  setCategoryFn,
  updateParticipantFn,
  updateTeamDetailsFn,
} from '~/lib/team-functions'
import type { ParticipantRow } from '~/server/db/schema'

export const Route = createFileRoute('/dashboard_/$teamId')({
  beforeLoad: async () => {
    const session = await getSession()
    const access = decideDashboardAccess(session)

    if (access.type === 'redirect') {
      throw redirect({ to: access.to })
    }

    return { user: access.user }
  },
  loader: async ({ params }) => {
    const [details, categories] = await Promise.all([
      getTeamDetailsFn({ data: { teamId: params.teamId } }),
      listAllCategoriesFn(),
    ])
    return { details, categories }
  },
  component: TeamDetailPage,
})

function TeamDetailPage() {
  const context = Route.useRouteContext()
  const loaderData = Route.useLoaderData()
  const params = Route.useParams()
  const router = useRouter()

  // Category picker
  const [isSavingCategory, setIsSavingCategory] = createSignal(false)

  // Responsible adult form
  const [raName, setRaName] = createSignal(
    loaderData().details.team.responsibleAdultName ?? context().user.name,
  )
  const [raPhone, setRaPhone] = createSignal(
    loaderData().details.team.responsibleAdultPhone ?? '',
  )
  const [raEmail, setRaEmail] = createSignal(
    loaderData().details.team.responsibleAdultEmail ?? '',
  )
  const [org, setOrg] = createSignal(
    loaderData().details.team.organization ?? '',
  )
  const [isSavingDetails, setIsSavingDetails] = createSignal(false)

  // Add participant form
  const [newParticipantName, setNewParticipantName] = createSignal('')
  const [newParticipantYear, setNewParticipantYear] = createSignal('')
  const [isAddingParticipant, setIsAddingParticipant] = createSignal(false)

  // Edit participant inline
  const [editingParticipantId, setEditingParticipantId] = createSignal<
    string | null
  >(null)
  const [editName, setEditName] = createSignal('')
  const [editYear, setEditYear] = createSignal('')

  function startEditParticipant(p: ParticipantRow) {
    setEditingParticipantId(p.id)
    setEditName(p.name)
    setEditYear(String(p.birthYear))
  }

  function cancelEditParticipant() {
    setEditingParticipantId(null)
    setEditName('')
    setEditYear('')
  }

  async function handleCategoryChange(categoryId: string) {
    setIsSavingCategory(true)
    try {
      await setCategoryFn({
        data: {
          teamId: params().teamId,
          categoryId: categoryId === '' ? null : categoryId,
        },
      })
      await router.invalidate()
    } finally {
      setIsSavingCategory(false)
    }
  }

  async function handleSaveDetails(e: SubmitEvent) {
    e.preventDefault()
    setIsSavingDetails(true)
    try {
      await updateTeamDetailsFn({
        data: {
          teamId: params().teamId,
          responsibleAdultName: raName().trim() || null,
          responsibleAdultPhone: raPhone().trim() || null,
          responsibleAdultEmail: raEmail().trim() || null,
          organization: org().trim() || null,
        },
      })
      await router.invalidate()
    } finally {
      setIsSavingDetails(false)
    }
  }

  async function handleAddParticipant(e: SubmitEvent) {
    e.preventDefault()
    const name = newParticipantName().trim()
    const birthYear = parseInt(newParticipantYear(), 10)
    if (!name || isNaN(birthYear)) return
    setIsAddingParticipant(true)
    try {
      await addParticipantFn({
        data: { teamId: params().teamId, name, birthYear },
      })
      setNewParticipantName('')
      setNewParticipantYear('')
      await router.invalidate()
    } finally {
      setIsAddingParticipant(false)
    }
  }

  async function handleUpdateParticipant(participantId: string, e: SubmitEvent) {
    e.preventDefault()
    const name = editName().trim()
    const birthYear = parseInt(editYear(), 10)
    if (!name || isNaN(birthYear)) return
    await updateParticipantFn({
      data: {
        participantId,
        teamId: params().teamId,
        name,
        birthYear,
      },
    })
    cancelEditParticipant()
    await router.invalidate()
  }

  async function handleRemoveParticipant(participantId: string) {
    await removeParticipantFn({
      data: { participantId, teamId: params().teamId },
    })
    await router.invalidate()
  }

  function isOutOfBand(birthYear: number) {
    const cat = loaderData().details.category
    if (!cat) return false
    return !checkAgeBandEligibility(birthYear, cat)
  }

  return (
    <PageShell size="sm">
      <div class="max-w-lg mx-auto">
        <div class="mb-6 flex items-center gap-3">
          <Link
            to="/dashboard"
            class="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Tilbage til dashboard
          </Link>
        </div>

        <Heading level="h1" class="mb-1">
          {loaderData().details.team.name}
        </Heading>
        <p class="text-sm text-muted-foreground mb-8">Redigér holddetaljer</p>

        {/* ------------------------------------------------------------------ */}
        {/* Category picker                                                     */}
        {/* ------------------------------------------------------------------ */}
        <section class="mb-8">
          <Heading level="h2" class="mb-3">
            Kategori
          </Heading>
          <select
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            value={loaderData().details.category?.id ?? ''}
            onChange={(e) => void handleCategoryChange(e.currentTarget.value)}
            disabled={isSavingCategory()}
          >
            <option value="">— Vælg kategori —</option>
            <For each={loaderData().categories}>
              {(cat) => (
                <option value={cat.id}>
                  {cat.eventName} — {cat.name}
                </option>
              )}
            </For>
          </select>
          <Show when={loaderData().details.category}>
            {(cat) => (
              <p class="mt-1 text-xs text-muted-foreground">
                Årgange: {cat().minBirthYear ?? '—'} – {cat().maxBirthYear ?? '—'}
              </p>
            )}
          </Show>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* Participants                                                         */}
        {/* ------------------------------------------------------------------ */}
        <section class="mb-8">
          <Heading level="h2" class="mb-3">
            Deltagere
          </Heading>

          <Show
            when={loaderData().details.participants.length > 0}
            fallback={
              <p class="text-sm text-muted-foreground mb-4">
                Ingen deltagere tilføjet endnu.
              </p>
            }
          >
            <ul class="space-y-2 mb-4">
              <For each={loaderData().details.participants}>
                {(p) => (
                  <li class="rounded-lg border border-border px-4 py-3">
                    <Show
                      when={editingParticipantId() === p.id}
                      fallback={
                        <div class="flex items-center gap-3">
                          <div class="flex-1">
                            <span class="font-medium">{p.name}</span>
                            <span class="ml-2 text-sm text-muted-foreground">
                              f. {p.birthYear}
                            </span>
                            <Show when={isOutOfBand(p.birthYear)}>
                              <span class="ml-2 rounded-full bg-yellow-100 text-yellow-800 px-2 py-0.5 text-xs font-medium">
                                Udenfor aldersgrænse
                              </span>
                            </Show>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditParticipant(p)}
                          >
                            Redigér
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleRemoveParticipant(p.id)}
                          >
                            Fjern
                          </Button>
                        </div>
                      }
                    >
                      <form
                        class="flex items-center gap-2"
                        onSubmit={(e) => void handleUpdateParticipant(p.id, e)}
                      >
                        <input
                          class="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          value={editName()}
                          onInput={(e) => setEditName(e.currentTarget.value)}
                          placeholder="Navn"
                          required
                          maxLength={200}
                        />
                        <input
                          class="w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          value={editYear()}
                          onInput={(e) => setEditYear(e.currentTarget.value)}
                          placeholder="Årstal"
                          type="number"
                          min={1990}
                          max={2030}
                          required
                        />
                        <Button type="submit" size="sm">
                          Gem
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={cancelEditParticipant}
                        >
                          Annuller
                        </Button>
                      </form>
                    </Show>
                  </li>
                )}
              </For>
            </ul>
          </Show>

          <form
            class="flex items-center gap-2"
            onSubmit={(e) => void handleAddParticipant(e)}
          >
            <input
              class="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Navn"
              value={newParticipantName()}
              onInput={(e) => setNewParticipantName(e.currentTarget.value)}
              required
              maxLength={200}
              disabled={isAddingParticipant()}
            />
            <input
              class="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Fødselsår"
              value={newParticipantYear()}
              onInput={(e) => setNewParticipantYear(e.currentTarget.value)}
              type="number"
              min={1990}
              max={2030}
              required
              disabled={isAddingParticipant()}
            />
            <Button type="submit" disabled={isAddingParticipant()}>
              Tilføj
            </Button>
          </form>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* Responsible Adult + Organization                                    */}
        {/* ------------------------------------------------------------------ */}
        <section class="mb-8">
          <Heading level="h2" class="mb-3">
            Ansvarlig voksen
          </Heading>
          <form onSubmit={(e) => void handleSaveDetails(e)} class="space-y-3">
            <div>
              <label class="block text-sm font-medium mb-1">
                Navn <span class="text-destructive">*</span>
              </label>
              <input
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={raName()}
                onInput={(e) => setRaName(e.currentTarget.value)}
                placeholder="Fulde navn"
                required
                maxLength={200}
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">
                Telefon <span class="text-destructive">*</span>
              </label>
              <input
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={raPhone()}
                onInput={(e) => setRaPhone(e.currentTarget.value)}
                placeholder="+45 00 00 00 00"
                required
                maxLength={50}
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">
                E-mail <span class="text-muted-foreground text-xs">(valgfri)</span>
              </label>
              <input
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={raEmail()}
                onInput={(e) => setRaEmail(e.currentTarget.value)}
                placeholder="kontakt@example.com"
                type="email"
                maxLength={200}
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">
                Organisation <span class="text-muted-foreground text-xs">(valgfri)</span>
              </label>
              <input
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={org()}
                onInput={(e) => setOrg(e.currentTarget.value)}
                placeholder="Skole, klub eller forening"
                maxLength={200}
              />
            </div>
            <Button type="submit" disabled={isSavingDetails()}>
              {isSavingDetails() ? 'Gemmer…' : 'Gem detaljer'}
            </Button>
          </form>
        </section>
      </div>
    </PageShell>
  )
}
