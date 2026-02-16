import {
  BookText,
  Bot,
  HeartHandshake,
  MapPin,
  PiggyBank,
  Trophy,
} from 'lucide-solid'
import type { Component } from 'solid-js'
import type { FileRoutesByFullPath } from '~/routeTree.gen'

// Derive InfoRoute from the router's generated types - only /info/* routes
type AllRoutes = keyof FileRoutesByFullPath
export type InfoRoute = Extract<AllRoutes, `/info/${string}`>

// Icon component type (Lucide icons accept class prop)
export type IconComponent = Component<{ class?: string }>

// Info topic definition type
export interface InfoTopic {
  route: InfoRoute
  icon: IconComponent
  title: string
  description: string
  shortTitle: string
}

// Info topics array - stores component references, not JSX
export const INFO_TOPICS: ReadonlyArray<InfoTopic> = [
  {
    route: '/info/prizes',
    icon: Trophy,
    title: 'Hvad kan man vinde?',
    shortTitle: 'Præmier',
    description:
      'Hovedpremien er en fuldtbetalt rejse til WRO-verdensfinalen. Se alle præmier her.',
  },
  {
    route: '/info/date',
    icon: MapPin,
    title: 'Hvor og hvornår afholdes den danske finale?',
    shortTitle: 'Dato & Sted',
    description:
      'Find dato, sted og program for den danske finale.',
  },
  {
    route: '/info/materials',
    icon: Bot,
    title: 'Hvad skal man bruge for at deltage?',
    shortTitle: 'Materialer',
    description:
      'Du skal bruge et robotsæt og byggematerialer. De fleste bruger LEGO EV3 eller Spike Prime. Se mere om hvilke materialer der er tilladte her.',
  },
  {
    route: '/info/cost',
    icon: PiggyBank,
    title: 'Hvad koster det at deltage?',
    shortTitle: 'Pris',
    description: 'Man skal kun betale for en øve-bane',
  },
  {
    route: '/info/tips',
    icon: HeartHandshake,
    title: 'Gode råd fra tidligere deltagere',
    shortTitle: 'Tips & Tricks',
    description: 'Hør hvad andre deltagere har at sige om at deltage i WRO.',
  },
  {
    route: '/info/resources',
    icon: BookText,
    title: 'Andre online ressourcer',
    shortTitle: 'Ressourcer',
    description:
      'Find links til andre ressourcer om WRO, robot-byggeri, programmering og mere.',
  },
]

// Helper to get an info topic by route
export function getInfoTopicByRoute(route: InfoRoute): InfoTopic {
  const topic = INFO_TOPICS.find((t) => t.route === route)
  if (!topic) {
    throw new Error(`Info topic not found for route: ${route}`)
  }
  return topic
}
