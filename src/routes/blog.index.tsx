import { Link, createFileRoute } from '@tanstack/solid-router'
import { createServerFn } from '@tanstack/solid-start'
import { For } from 'solid-js'
import type { BlogPostMeta } from '~/server/content'
import { getAllBlogPosts } from '~/server/content'

const getBlogPosts = createServerFn({
  method: 'GET',
}).handler(async (): Promise<Array<BlogPostMeta>> => {
  return getAllBlogPosts()
})

export const Route = createFileRoute('/blog/')({
  component: BlogIndex,
  loader: async () => await getBlogPosts(),
})

function BlogIndex() {
  const posts = Route.useLoaderData()

  return (
    <div class="min-h-screen bg-gray-50">
      <section class="py-16 px-6 max-w-4xl mx-auto">
        <h1 class="text-4xl md:text-5xl font-bold text-slate-800 mb-8">Blog</h1>

        <div class="space-y-6">
          <For
            each={posts()}
            fallback={<p class="text-slate-500">Ingen blog posts endnu.</p>}
          >
            {(post) => (
              <article class="bg-white border border-gray-200 rounded-xl p-6 hover:border-wro-blue-300 transition-all duration-300 hover:shadow-md">
                <Link to="/blog/$slug" params={{ slug: post.slug }} class="block">
                  <h2 class="text-2xl font-semibold text-slate-800 mb-2 hover:text-wro-blue-600 transition-colors">
                    {post.title}
                  </h2>
                  {post.description && (
                    <p class="text-slate-500 mb-3">{post.description}</p>
                  )}
                  <time class="text-sm text-slate-400">
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
