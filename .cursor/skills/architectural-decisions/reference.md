# Reference: Architecture Document Examples

## Full Architectural Doc Example

````markdown
---
name: Controls as Data
status: implemented  # draft | proposed | accepted | implemented | superseded | deprecated
authors:
  - Michael
created: 2026-02-01
updated: 2026-02-10
codeAnchors:
  - libs/react/map/src/controls/
relatedPlans:
  - provider-agnostic-map-system
overview: >
  Declarative, config-driven controls system where map controls are plain data
  objects rendered through a middleware pipeline. Separates what controls exist
  (data), how they look (rendering rules), and where they appear (layout).
---

# Controls as Data

> **Status**: Implemented (February 2026).

## Table of Contents

1. [The Problem](#the-problem)
2. [Core Idea](#core-idea)
3. [Usage](#usage)
4. [Semantic Areas](#semantic-areas)
5. [Adaptive Rendering](#adaptive-rendering)
6. [Alternatives Considered](#alternatives-considered)
7. [Revision History](#revision-history)

## The Problem

Map controls compound quickly. Bespoke components (`ZoomButtons`, `FullscreenButton`, etc.) work for a small set, but cross-cutting changes (compact mode, tooltip behavior) require touching every component.

We needed to separate: **what controls exist** (data), **how they look** (rendering rules), **where they appear** (layout).

## Core Idea

Controls are **plain data objects**, not React components. Each is a config object with a discriminated `type` field and pre-bound callbacks. The rendering layer never needs to know where data comes from or how actions are dispatched.

Adding a new control type to the discriminated union produces a compile error until all renderers handle it.

## Usage

```tsx
const MyMap = () => {
  const [Map, api] = useMap(googleMapsAdapter({ apiKey }));
  return (
    <MapContainer>
      <Map>{children}</Map>
      <Controls api={api} />
    </MapContainer>
  );
};
```

The consumer doesn't wire up handlers or refs. `Controls` builds its config internally from the map API.

## Semantic Areas

Controls are organized by **purpose, not position**:

| Area         | Purpose               | Examples                          |
| ------------ | --------------------- | --------------------------------- |
| `navigation` | Core map manipulation | Zoom, fullscreen, compass         |
| `settings`   | Configuration         | Layer toggles, map style selector |
| `tools`      | Interactive tools     | Drawing, measurement, selection   |
| `statistics` | Data summaries        | Asset counts, stats panels        |

Layout (which corner, what order) is an internal concern. Changing it requires no consumer code changes.

## Adaptive Rendering

The same config renders differently along two dimensions:

- **Placement**: standalone (floating on map) vs menu (inside popover)
- **Density**: compact (small container) vs spacious (full-size map)

A pure middleware pipeline resolves these before renderers see the config. Renderers are purely presentational.

## Alternatives Considered

**Per-control components**: Break down because cross-cutting changes touch every component and there's no single place to reason about what controls exist.

**React Context for render context**: Only two components need it, one level apart. Props make the flow trivially followable.

## Revision History

- **2026-02-01** (Michael): Initial draft capturing controls-as-data philosophy
- **2026-02-05** (Michael): Added adaptive rendering and semantic areas
- **2026-02-10** (Michael): Consolidated with rendering pipeline doc
````

---

## Lightweight Decision Note Example

````markdown
---
name: Relative Zoom Over Absolute Zoom
status: implemented
authors:
  - Michael
created: 2026-02-03
updated: 2026-02-03
codeAnchors:
  - libs/react/map/src/hooks/useMap.ts
relatedPlans:
  - controls-as-data
overview: >
  The map API exposes zoom(delta) for relative zoom changes instead of only
  setZoom(level). Controls exclusively use the relative variant.
---

# Relative Zoom Over Absolute Zoom

> **Status**: Implemented.

## Context

Map controls need to zoom in and out. The question was whether to expose only `setZoom(level)` (absolute) or also `zoom(delta)` (relative).

## Decision

Controls exclusively use `zoom(delta)` -- it's self-contained, avoids stale closure bugs, and maps naturally to stepper controls. `setZoom(level)` remains available for programmatic use.

## Consequences

- Control configs are simpler -- no reactive state needed
- Delta-based API composes better for future animated transitions

## Revision History

- **2026-02-03** (Michael): Initial decision during controls implementation
````
