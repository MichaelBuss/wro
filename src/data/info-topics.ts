import {
  BookText,
  Bot,
  HeartHandshake,
  MapPin,
  PiggyBank,
  Trophy,
} from 'lucide-solid'
import { CONSTANTS } from './constants'
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
  Icon: IconComponent
  title: string
  description: string
  shortTitle: string
}

// Info topics array - stores component references, not JSX
export const INFO_TOPICS: ReadonlyArray<InfoTopic> = [
  {
    route: '/info/prizes',
    Icon: Trophy,
    title: 'Hvad kan man vinde?',
    shortTitle: 'Præmier',
    description: `Hovedpremien er en fuldtbetalt rejse til WRO-verdensfinalen som i år afholdes i ${CONSTANTS.WORLD_FINAL_LOCATION}.`,
  },
  {
    route: '/info/date',
    Icon: MapPin,
    title: 'Hvor og hvornår afholdes den danske finale?',
    shortTitle: 'Dato & Sted',
    description: `Den danske finale afholdes ${CONSTANTS.DANISH_FINAL_DATE.toLocaleDateString('da-DK', { day: '2-digit', month: '2-digit', year: 'numeric' })} på ${CONSTANTS.DANISH_FINAL_LOCATION}.`,
  },
  {
    route: '/info/materials',
    Icon: Bot,
    title: 'Hvad skal man bruge for at deltage?',
    shortTitle: 'Materialer',
    description:
      'Du skal bruge et robotsæt og byggematerialer. De fleste bruger LEGO EV3 eller Spike Prime. Se mere om hvilke materialer der er tilladte her.',
  },
  {
    route: '/info/cost',
    Icon: PiggyBank,
    title: 'Hvad koster det at deltage?',
    shortTitle: 'Pris',
    description: 'Man skal kun betale for en øve-bane',
  },
  {
    route: '/info/tips',
    Icon: HeartHandshake,
    title: 'Gode råd fra tidligere deltagere',
    shortTitle: 'Tips & Tricks',
    description: 'Hør hvad andre deltagere har at sige om at deltage i WRO.',
  },
  {
    route: '/info/resources',
    Icon: BookText,
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
