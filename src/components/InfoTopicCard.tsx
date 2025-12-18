import { Link } from '@tanstack/solid-router'
import type { InfoTopic } from '~/data/info-topics'

interface InfoTopicCardProps {
  topic: InfoTopic
}

export function InfoTopicCard(props: InfoTopicCardProps) {
  return (
    <Link
      to={props.topic.route}
      class="block bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:border-wro-blue-300 transition-all duration-300 hover:shadow-md group"
    >
      <div class="mb-4">
        <props.topic.icon class="w-12 h-12 text-wro-blue-500" />
      </div>
      <h3 class="text-xl font-semibold text-slate-800 mb-3 group-hover:text-wro-blue-600 transition-colors">
        {props.topic.title}
      </h3>
      <p class="text-slate-600 leading-relaxed">{props.topic.description}</p>
    </Link>
  )
}
