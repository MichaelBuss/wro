# Context Glossary

The canonical language for the WRO Denmark website domain. This file is a
glossary, not a spec — it defines terms, not implementation.

## Team Registration

Terms concerning how teams sign up for the competition and manage their entry.

### Account

A person who can log in. In practice this is the **coach/registrant** — the
adult who signs a team up. An Account is the unit of authentication (it owns the
credentials and receives password resets), not the Team itself.

- An Account can manage **one or more** Teams.
- Students are **not** Accounts; they are described *within* a Team's data but do
  not log in.

### Team

A single competition entry, created and managed by an Account. A Team is the
thing that gets registered, appears in a category, and (later) competes in the
bracket.

- A Team is linked to the Account(s) permitted to manage it. Today exactly one
  Account (the registrant) manages a Team; the model permits more than one so a
  second coach could be added later without a redesign.
- "Logging in as a team" is shorthand for "an Account logging in and seeing the
  Teams it manages" — there is no shared per-team credential.

### Registration Status

Where a Team sits in the sign-up lifecycle. Registration is **organizer-confirmed**:
a submission is a request, not a guarantee. The canonical states are:

- **Draft** — saved by the Account but not yet submitted; editable freely.
- **Submitted** — sent for organizer review; awaiting a decision.
- **Confirmed** — accepted by an organizer; the team has a place.
- **Waitlisted** — valid but over capacity; may be promoted to Confirmed later.
- **Withdrawn** — pulled out (by the Account or organizer) after submitting.

"Membership" is **not** used — a Team has a *registration status*, not a
membership. There is no ongoing/paid subscription concept.

### Payment Status

Whether a Team has paid any required entry fee, tracked as a **separate flag**
from Registration Status (e.g. unpaid / paid / waived). Payment is recorded by
organizers, **not collected online** through this system.

### Organizer

A person who reviews and confirms registrations and manages the competition.
Distinct from a coach Account: organizers see and act on *all* Teams, whereas a
coach Account only sees the Teams it manages.

### Event

A specific happening that Teams register for, e.g. "WRO Denmark 2026". Every Team
registration belongs to exactly one Event. Accounts are **not** scoped to an
Event — the same coach reuses one Account to register Teams across many Events
(different years, or a competition and a practice weekend).

Events have a **kind**:

- **Competition** — the ranked national event; feeds the bracket and scoring.
  Winning here makes a team eligible for the international final (that
  qualification is downstream and **out of scope** for this system).
- **Gathering** — a lighter event (e.g. a practice weekend) where registration
  is mainly a headcount/RSVP; no ranking or bracket.

Denmark currently runs one Competition at a time, but multiple Events may be open
concurrently (e.g. a Competition and a Gathering).

### Category

A division within a Competition Event that Teams compete in, defined by a name
and an age band (e.g. "RoboMission Junior, ages 11–15"). Categories are
configured **per Event** — not a fixed code-level list — because WRO's category
lineup changes between seasons. A Team registration selects exactly one Category.
The bracket later groups Confirmed Teams by their Category.

### Participant

A student on a Team, captured as name + birth year. Birth year drives **age-band
eligibility**: the system can check a Team's Participants against its chosen
Category's age band and flag mismatches for Organizers. Participants do not log
in and are not Accounts.

### Responsible Adult

The on-site adult accountable for a specific Team (the "team coach"). Stored as
per-Team contact info — name + phone, email optional — pre-filled from the
Account holder but editable per Team, because one Account holder may delegate a
team to a helper (e.g. an aged-out former competitor). A Responsible Adult is
**contact information, not a login**; the Account holder remains the sole login.

### Organization

The school, spare-time club, or parent group a Team is affiliated with. A single
**optional** free-text field — not every Team has one (some are organized by a
parent or an informal group).
