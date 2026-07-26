# Content TODOs

Tracks unresolved content gaps left as `TODO(content)` markers across the codebase after the
[wro-content-rewrite](/.cursor/plans/wro-content-rewrite_5a9d237b.plan.md) pass. Grep for
`TODO(content)` to find every marker in place; this doc explains what's needed to resolve each one.

## Facts

- **`content/pages/event-info.md`** (`danish_final_time`): the live site doesn't publish an exact
  daily schedule yet. Needs the real Danish-final start/end time once announced.
- **`src/data/constants.ts`** (`DANISH_FINAL_SCHEDULE`): the full hour-by-hour program (arrival,
  opening ceremony, rounds, lunch, finals, awards) is invented filler. Needs the real published
  program for the Danish final.
- **`content/pages/prizes.md`** (2nd/3rd place entries): the live site only confirms that Junior/
  Senior winners represent Denmark at the WRO-2026 world final in Puerto Rico. No confirmed 2nd/3rd
  place prizes exist on the live site — needs verification with WRO Denmark organizers.
- **`content/pages/cost.md`** (`homepage_tags` / `expenses` "~500–800 kr" practice-track figure):
  unverified estimate, not sourced from the live site. Needs a real number or range.
- **`content/pages/materials.md`** (`LEGO SPIKE Essential`, `Andre godkendte systemer` kits): the
  live site only confirms LEGO EV3 and Spike Prime as kits used. These extra entries are embellished
  and should be verified against WRO's official materials list, or removed.

## Missing pages / links

- **Rules page rules PDFs**: the live rules page mostly links out to "coming soon" PDFs per
  category/age-group. `content/pages/rules.md` material entries omit `url` for these — once WRO
  Denmark publishes the PDFs, fill in the real links.
- **Kontakt / newsletter** (`src/routes/contact.tsx`): the real newsletter signup URL is unknown —
  currently falls back to a mailto link, replace with the actual signup form/URL once known.
- **Tilmelding / Open Championships** (`src/routes/signup.tsx`): the actual Danish-final
  registration link/form is unknown — currently the CTA points to `/contact` as a fallback,
  replace with the real registration URL once known.
- **Bestil en bane** (`src/routes/order-a-track.tsx`): the real track-mat order URL/process is
  unknown — currently the CTA falls back to a mailto link, replace with the actual order form/URL
  once known. The "~500–800 kr" price is the same unverified estimate as `content/pages/cost.md`.

## Kept-as-is (not on the live site, flagged as fabricated/placeholder)

- Tips & Tricks quotes (`content/quotes/*.md`) — invented testimonials, not real participant
  quotes.
- `hello-world` blog post (`content/blog/hello-world.md`) — placeholder content, not a real post.
- Generic practical tips (`content/practical-tips/*.md`) — plausible but unverified advice, not
  sourced from real past participants.
