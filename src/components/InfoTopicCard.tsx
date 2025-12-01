import { Link } from '@tanstack/solid-router'
import {
  BookText,
  Bot,
  HeartHandshake,
  MapPin,
  PiggyBank,
  Trophy,
} from 'lucide-solid'
import type { IconName, InfoTopic } from '~/data/info-topics'

interface InfoTopicCardProps {
  topic: InfoTopic
}

// Simple icon renderer - icons are rendered here in the component, not at module level
function TopicIcon(props: { name: IconName; class?: string }) {
  const iconClass = props.class ?? 'w-12 h-12 text-cyan-400'

  switch (props.name) {
    case 'trophy':
      return <Trophy class={iconClass} />
    case 'map-pin':
      return <MapPin class={iconClass} />
    case 'bot':
      return <Bot class={iconClass} />
    case 'piggy-bank':
      return <PiggyBank class={iconClass} />
    case 'heart-handshake':
      return <HeartHandshake class={iconClass} />
    case 'book-text':
      return <BookText class={iconClass} />
  }
}

export function InfoTopicCard(props: InfoTopicCardProps) {
  return (
    <Link
      to={props.topic.route}
      class="block bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 group"
    >
      <div class="mb-4">
        <TopicIcon name={props.topic.icon} />
      </div>
      <h3 class="text-xl font-semibold text-white mb-3 group-hover:text-cyan-400 transition-colors">
        {props.topic.title}
      </h3>
      <p class="text-gray-400 leading-relaxed">{props.topic.description}</p>
    </Link>
  )
}
