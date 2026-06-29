import { Link, createFileRoute } from '@tanstack/solid-router'
import { createServerFn } from '@tanstack/solid-start'
import { Show } from 'solid-js'
import { PageShell } from '~/components/layout'
import { Heading, Prose } from '~/components/ui'
import type { BlogPost } from '~/server/content'
import { getBlogPost } from '~/server/content'

const getPost = createServerFn({
  method: 'GET',
})
  .validator((slug: string) => slug)
  .handler(({ data: slug }): BlogPost | null => {
    return getBlogPost(slug)
  })

export const Route = createFileRoute('/blog/$slug')({
  component: BlogPostPage,
  loader: async ({ params }) => await getPost({ data: params.slug }),
})

function BlogPostPage() {
  const post = Route.useLoaderData()

  return (
    <PageShell size="sm">
      <Show
        when={post()}
        fallback={
          <div class="text-center py-16">
            <Heading level="h1" class="mb-6">
              Post ikke fundet
            </Heading>
            <Link
              to="/blog"
              class="text-sm text-primary hover:underline underline-offset-4 transition-colors"
            >
              ← Tilbage til blog
            </Link>
          </div>
        }
      >
        {(postData) => (
          <article>
            <Link
              to="/blog"
              class="inline-block mb-10 text-caption text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              ← Blog
            </Link>

            <header class="mb-10 border-b border-border pb-10">
              <Heading level="h1" class="mb-4">
                {postData().title}
              </Heading>

              <Show when={postData().description}>
                <p class="text-lead text-foreground/70 mb-4">
                  {postData().description}
                </p>
              </Show>

              <time
                datetime={postData().date}
                class="text-caption text-muted-foreground"
              >
                {new Date(postData().date).toLocaleDateString('da-DK', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </header>

            <Show when={postData().image}>
              {(src) => (
                <img
                  src={src()}
                  alt={postData().title}
                  class="w-full rounded mb-10 border border-border"
                />
              )}
            </Show>

            <Prose html={postData().content} />
          </article>
        )}
      </Show>
    </PageShell>
  )
}
