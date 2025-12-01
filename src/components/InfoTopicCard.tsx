import { Link } from '@tanstack/solid-router'
import type { InfoTopic } from '~/data/info-topics'

interface InfoTopicCardProps {
  topic: InfoTopic
}

export function InfoTopicCard(props: InfoTopicCardProps) {
  return (
    <Link
      to={props.topic.route}
      class="block bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 group"
    >
      <div class="mb-4">
        <props.topic.Icon class="w-12 h-12 text-cyan-400" />
      </div>
      <h3 class="text-xl font-semibold text-white mb-3 group-hover:text-cyan-400 transition-colors">
        {props.topic.title}
      </h3>
      <p class="text-gray-400 leading-relaxed">{props.topic.description}</p>
    </Link>
  )
}
