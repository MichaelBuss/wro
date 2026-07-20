import {
  BookText,
  Bot,
  HeartHandshake,
  MapPin,
  PiggyBank,
  ScrollText,
  Trophy,
} from 'lucide-solid'
import type { Component } from 'solid-js'
import type { FileRoutesByFullPath } from '~/routeTree.gen'

// Derive InfoRoute from the router's generated types - only /info/* routes
type AllRoutes = keyof FileRoutesByFullPath
export type InfoRoute = Extract<AllRoutes, `/info/${string}`>

// Icon component type (Lucide icons accept class prop)
export type IconComponent = Component<{ class?: string }>

// One of the 8 WRO logo palette hues (left-to-right rainbow + red)
export type LogoPaletteColor =
  | 'blue'
  | 'cyan'
  | 'green'
  | 'lime'
  | 'yellow'
  | 'orange'
  | 'magenta'
  | 'red'

// Info topic definition type
export interface InfoTopic {
  route: InfoRoute
  icon: IconComponent
  title: string
  description: string
  shortTitle: string
  color: LogoPaletteColor
}

// Info topics array - stores component references, not JSX
export const INFO_TOPICS: ReadonlyArray<InfoTopic> = [
  {
    route: '/info/prizes',
    icon: Trophy,
    color: 'blue',
    title: 'Hvad kan man vinde?',
    shortTitle: 'Præmier',
    description:
      'Vinderne af Junior og Senior får mulighed for at repræsentere Danmark ved WRO-verdensfinalen. Se alle præmier her.',
  },
  {
    route: '/info/date',
    icon: MapPin,
    color: 'cyan',
    title: 'Hvor og hvornår afholdes den danske finale?',
    shortTitle: 'Dato & Sted',
    description: 'Find dato, sted og program for den danske finale.',
  },
  {
    route: '/info/materials',
    icon: Bot,
    color: 'green',
    title: 'Hvad skal man bruge for at deltage?',
    shortTitle: 'Materialer',
    description:
      'Du skal bruge et robotsæt og byggematerialer. De fleste bruger LEGO EV3 eller Spike Prime. Se mere om hvilke materialer der er tilladte her.',
  },
  {
    route: '/info/cost',
    icon: PiggyBank,
    color: 'lime',
    title: 'Hvad koster det at deltage?',
    shortTitle: 'Pris',
    description: 'Man skal kun betale for en øve-bane',
  },
  {
    route: '/info/tips',
    icon: HeartHandshake,
    color: 'orange',
    title: 'Gode råd fra tidligere deltagere',
    shortTitle: 'Tips & Tricks',
    description: 'Hør hvad andre deltagere har at sige om at deltage i WRO.',
  },
  {
    route: '/info/regler',
    icon: ScrollText,
    color: 'yellow',
    title: 'Hvilke regler gælder for konkurrencen?',
    shortTitle: 'Regler',
    description:
      'Se reglerne for RoboMission og Future Innovators, opdelt efter kategori og aldersgruppe.',
  },
  {
    route: '/info/resources',
    icon: BookText,
    color: 'magenta',
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
