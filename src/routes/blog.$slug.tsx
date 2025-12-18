import { Link, createFileRoute } from '@tanstack/solid-router'
import { createServerFn } from '@tanstack/solid-start'
import { Show } from 'solid-js'
import type { BlogPost } from '~/server/content'
import { getBlogPost, getBlogSlugs } from '~/server/content'

const getPost = createServerFn({
  method: 'GET',
})
  .inputValidator((slug: string) => slug)
  .handler(({ data: slug }): BlogPost | null => {
    return getBlogPost(slug)
  })

// Export slugs for static prerendering
export const getBlogPostSlugs = createServerFn({
  method: 'GET',
}).handler((): Array<string> => {
  return getBlogSlugs()
})

export const Route = createFileRoute('/blog/$slug')({
  component: BlogPostPage,
  loader: async ({ params }) => await getPost({ data: params.slug }),
})

function BlogPostPage() {
  const post = Route.useLoaderData()

  return (
    <div class="min-h-screen bg-gray-50">
      <Show
        when={post()}
        fallback={
          <div class="py-16 px-6 max-w-4xl mx-auto text-center">
            <h1 class="text-4xl font-bold text-slate-800 mb-4">
              Post ikke fundet
            </h1>
            <Link
              to="/blog"
              class="text-wro-blue-600 hover:text-wro-blue-500 transition-colors"
            >
              ← Tilbage til blog
            </Link>
          </div>
        }
      >
        {(postData) => (
          <article class="py-16 px-6 max-w-4xl mx-auto">
            <Link
              to="/blog"
              class="inline-block mb-8 text-wro-blue-600 hover:text-wro-blue-500 transition-colors"
            >
              ← Tilbage til blog
            </Link>

            <header class="mb-8">
              <h1 class="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
                {postData().title}
              </h1>
              {postData().description && (
                <p class="text-xl text-slate-500 mb-4">
                  {postData().description}
                </p>
              )}
              <time class="text-slate-400">
                {new Date(postData().date).toLocaleDateString('da-DK', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </header>

            {postData().image && (
              <img
                src={postData().image}
                alt={postData().title}
                class="w-full rounded-xl mb-8 border border-gray-200"
              />
            )}

            <div
              class="prose prose-lg max-w-none
                prose-headings:text-slate-800 prose-headings:font-semibold
                prose-p:text-slate-600 prose-p:leading-relaxed
                prose-a:text-wro-blue-600 prose-a:no-underline hover:prose-a:underline
                prose-strong:text-slate-800
                prose-ul:text-slate-600 prose-ol:text-slate-600
                prose-li:marker:text-wro-blue-500
                prose-code:text-wro-blue-700 prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded
                prose-pre:bg-gray-100 prose-pre:border prose-pre:border-gray-200"
              // eslint-disable-next-line solid/no-innerhtml -- Markdown content is sanitized server-side
              innerHTML={postData().content}
            />
          </article>
        )}
      </Show>
    </div>
  )
}
