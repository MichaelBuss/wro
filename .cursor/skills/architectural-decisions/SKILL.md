---
name: architectural-decisions
description: >
  Create and maintain architectural decision documents that capture the "why"
  behind significant design choices in libraries and apps. Supports creating
  new docs, updating existing ones, converting Cursor plans or agent
  transcripts, and syncing docs against code drift.
---

# Architectural Decisions

Capture the "why" behind significant design choices in concise architecture docs.

## File Conventions

- **Location**: `{project-root}/docs/architecture/`
- **Naming**: `{kebab-case-name}.md`
- Dates and relationships live in frontmatter.

## Frontmatter

```yaml
---
name: Controls as Data
status: implemented  # draft | proposed | accepted | implemented | superseded | deprecated
authors:
  - Michael
created: 2026-02-01
updated: 2026-02-10
codeAnchors:           # optional: paths for sync checks
  - libs/react/map/src/controls/
relatedPlans:          # optional: related doc filenames without .md
  - provider-agnostic-map-system
overview: >
  Declarative, config-driven controls system where controls are plain data
  objects rendered through a middleware pipeline, not bespoke React components.
---
```

**Required**: `name`, `status`, `authors`, `created`, `updated`, `overview`
**Optional**: `codeAnchors`, `relatedPlans`, `supersededBy` (required when status is `superseded`)

## Document Structure

**Full doc** (broad impact): Status blockquote, TOC, Problem/Context, Decision, Usage examples, Architecture details, Alternatives Considered, Revision History.

**Lightweight note** (smaller decisions): Status blockquote, Context, Decision, Consequences, Revision History.

Same frontmatter and directory for both. See [reference.md](reference.md) for complete examples.

## Scope

These docs should read like an **architecture overview** -- something a new team member reads to understand the system's shape and reasoning.

**Document**: High-level architectural decisions, data model choices, API design, component patterns, system boundaries, trade-offs.

**Stay high-level**: Omit prop-level details, individual function signatures, minor naming choices, and small implementation tweaks. If a detail only matters when reading the code, it belongs in code comments.

**Do NOT document**: Storybook stories, test files, linting config, CI/CD tweaks, dependency bumps, cosmetic refactors, or other non-architectural changes.

## Workflows

### Before creating any new doc

**Always check for existing docs first.** Use **Glob** on `{project-root}/docs/architecture/*.md` and read any that overlap. If an existing doc covers the same area, **update it** (add/revise sections, append to revision history) rather than creating a new one.

### Asking questions

**Derive what you can from context first.** Use **Read**, **SemanticSearch**, and conversation history to infer reasoning. Only use **AskQuestion** when motivation genuinely isn't visible in the code or conversation.

### During feature development

- Start as `draft`; evolve through the lifecycle
- Focus on "why" over "what"
- One core architectural area = one document. Propose structure before writing.

### Documenting existing code

- Understand user-provided context first -- it's the most relevant source
- Use **Read** and **SemanticSearch** to explore the codebase
- Infer reasoning from code structure, naming, and patterns
- Only ask when the "why" is genuinely unclear
- Set initial status to `implemented`

### From a Cursor plan

- **Restructure, don't copy-paste**: plans are by steps; docs are by concepts
- Strip checklists and execution details; elevate the "why"

### From an agent transcript

- **Extract**: debates, trade-offs, direction changes
- **Skip**: tool calls, file reads, linting fixes, implementation steps
- Cross-reference against current code for divergences

### Sync check

- Use **Read** on `codeAnchors` paths to find relevant code
- Flag discrepancies, update `updated` date
- Propose superseding if architecture has fundamentally changed

## Writing Guidelines

- **Concise "why" before "what"**
- **Usage examples over type definitions**
- **Mermaid diagrams** for high-level visualization
- **No implementation details** -- no renderer code, file trees, or full type dumps
- **Alternatives Considered** -- "what we didn't do and why"
- **Keep docs short** -- clarity and density over completeness

## Granularity

**Default to updating an existing doc.** New work that extends an existing architectural area belongs as a new section or revision -- not a separate file.

**Create a new doc only when**: the core insight is genuinely different, has an independent lifecycle, or the existing doc would exceed ~400 lines.

## Revision History (Required)

Every architecture doc **must** end with a `## Revision History` section.

Format: `- **YYYY-MM-DD** (Author): Brief description of what changed`

When creating a new doc, add the initial entry. When updating, append a new entry **and** update the frontmatter `updated` field to match.
