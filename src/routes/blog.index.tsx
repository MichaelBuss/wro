import { Link, createFileRoute } from '@tanstack/solid-router'
import { createServerFn } from '@tanstack/solid-start'
import { For } from 'solid-js'
import type { BlogPostMeta } from '~/server/content'
import { getAllBlogPosts } from '~/server/content'

const getBlogPosts = createServerFn({
  method: 'GET',
}).handler((): Array<BlogPostMeta> => {
  return getAllBlogPosts()
})

export const Route = createFileRoute('/blog/')({
  component: BlogIndex,
  loader: async () => await getBlogPosts(),
})

function BlogIndex() {
  const posts = Route.useLoaderData()

  return (
    <div class="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <section class="py-16 px-6 max-w-4xl mx-auto">
        <h1 class="text-4xl md:text-5xl font-bold text-white mb-8">
          <span class="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Blog
          </span>
        </h1>

        <div class="space-y-6">
          <For
            each={posts()}
            fallback={
              <p class="text-gray-400">Ingen blog posts endnu.</p>
            }
          >
            {(post) => (
              <article class="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10">
                <Link
                  href={`/blog/${post.slug}`}
                  class="block"
                >
                  <h2 class="text-2xl font-semibold text-white mb-2 hover:text-cyan-400 transition-colors">
                    {post.title}
                  </h2>
                  {post.description && (
                    <p class="text-gray-400 mb-3">{post.description}</p>
                  )}
                  <time class="text-sm text-gray-500">
                    {new Date(post.date).toLocaleDateString('da-DK', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                </Link>
              </article>
            )}
          </For>
        </div>
      </section>
    </div>
  )
}

