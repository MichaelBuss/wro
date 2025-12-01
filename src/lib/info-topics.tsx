import {
  BookText,
  Bot,
  HeartHandshake,
  MapPin,
  PiggyBank,
  Trophy,
} from 'lucide-solid'
import { CONSTANTS } from './constants'
import type { JSX } from 'solid-js'
import type { FileRoutesByFullPath } from '~/routeTree.gen'

// Derive InfoRoute from the router's generated types - only /info/* routes
type AllRoutes = keyof FileRoutesByFullPath
export type InfoRoute = Extract<AllRoutes, `/info/${string}`>

// Info topic definition type - must have a valid route from the router
export interface InfoTopic {
  route: InfoRoute
  icon: JSX.Element
  title: string
  description: string
  shortTitle: string // For sidebar
}

// Info topics array - TypeScript ensures each topic has a valid route that exists in the router
export const INFO_TOPICS: ReadonlyArray<InfoTopic> = [
  {
    route: '/info/prizes',
    icon: <Trophy class="w-12 h-12 text-cyan-400" />,
    title: 'Hvad kan man vinde?',
    shortTitle: 'Præmier',
    description: `Hovedpremien er en fuldtbetalt rejse til WRO-verdensfinalen som i år afholdes i ${CONSTANTS.WORLD_FINAL_LOCATION}.`,
  },
  {
    route: '/info/date',
    icon: <MapPin class="w-12 h-12 text-cyan-400" />,
    title: 'Hvor og hvornår afholdes den danske finale?',
    shortTitle: 'Dato & Sted',
    description: `Den danske finale afholdes ${CONSTANTS.DANISH_FINAL_DATE.toLocaleDateString('da-DK', { day: '2-digit', month: '2-digit', year: 'numeric' })} på ${CONSTANTS.DANISH_FINAL_LOCATION}.`,
  },
  {
    route: '/info/materials',
    icon: <Bot class="w-12 h-12 text-cyan-400" />,
    title: 'Hvad skal man bruge for at deltage?',
    shortTitle: 'Materialer',
    description:
      'Du skal bruge et robotsæt og byggematerialer. De fleste bruger LEGO EV3 eller Spike Prime. Se mere om hvilke materialer der er tilladte her.',
  },
  {
    route: '/info/cost',
    icon: <PiggyBank class="w-12 h-12 text-cyan-400" />,
    title: 'Hvad koster det at deltage?',
    shortTitle: 'Pris',
    description: 'Man skal kun betale for en øve-bane',
  },
  {
    route: '/info/tips',
    icon: <HeartHandshake class="w-12 h-12 text-cyan-400" />,
    title: 'Gode råd fra tidligere deltagere',
    shortTitle: 'Tips & Tricks',
    description: 'Hør hvad andre deltagere har at sige om at deltage i WRO.',
  },
  {
    route: '/info/resources',
    icon: <BookText class="w-12 h-12 text-cyan-400" />,
    title: 'Andre online ressourcer',
    shortTitle: 'Ressourcer',
    description:
      'Find links til andre ressourcer om WRO, robot-byggeri, programmering og mere.',
  },
] as const

// Helper to get an info topic by route (type-safe)
export function getInfoTopicByRoute(route: InfoRoute): InfoTopic {
  const topic = INFO_TOPICS.find((t) => t.route === route)
  if (!topic) {
    throw new Error(`Info topic not found for route: ${route}`)
  }
  return topic
}
