import { Link, createFileRoute } from '@tanstack/solid-router'
import { createServerFn } from '@tanstack/solid-start'
import { For } from 'solid-js'
import { PageShell } from '~/components/layout'
import { Heading } from '~/components/ui'
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
    <PageShell size="sm">
      <Heading level="h1" class="mb-2">
        Blog
      </Heading>
      <p class="text-lead text-foreground/70 mb-10">
        Nyheder og opdateringer fra WRO Danmark
      </p>

      <div class="divide-y divide-border">
        <For
          each={posts()}
          fallback={
            <p class="py-8 text-sm-copy text-muted-foreground">
              Ingen blog posts endnu.
            </p>
          }
        >
          {(post) => (
            <article class="py-8 first:pt-0">
              <Link to="/blog/$slug" params={{ slug: post.slug }} class="group block">
                <time class="text-caption text-muted-foreground block mb-2">
                  {new Date(post.date).toLocaleDateString('da-DK', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
                <h2 class="font-serif text-h3 font-normal text-foreground group-hover:text-primary transition-colors mb-2">
                  {post.title}
                </h2>
                {post.description && (
                  <p class="text-sm-copy text-muted-foreground leading-relaxed">
                    {post.description}
                  </p>
                )}
              </Link>
            </article>
          )}
        </For>
      </div>
    </PageShell>
  )
}
