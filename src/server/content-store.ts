import type { CollectionName } from '~/content/registry'

/**
 * Seam between raw Markdown I/O and parse/validate logic.
 *
 * Production uses GlobAdapter (Vite import.meta.glob).
 * Tests use MapAdapter (plain Record — no Vite needed).
 */
export interface ContentStore {
  getRaw: (relativePath: string) => string | undefined
  listSlugs: (collection: CollectionName) => Array<string>
}

/**
 * Production adapter — wraps the Vite import.meta.glob result.
 * Files are keyed as '/content/{relativePath}'.
 */
export class GlobAdapter implements ContentStore {
  constructor(private readonly files: Record<string, string>) {}

  getRaw(relativePath: string): string | undefined {
    return this.files[`/content/${relativePath}`]
  }

  listSlugs(collection: CollectionName): Array<string> {
    const prefix = `/content/${collection}/`
    return Object.keys(this.files)
      .filter((p) => p.startsWith(prefix) && p.endsWith('.md'))
      .map((p) => p.slice(prefix.length).replace(/\.md$/, ''))
  }
}

/**
 * Test adapter — wraps a plain Record.
 * Files are keyed as '{relativePath}' (e.g. 'pages/homepage.md').
 */
export class MapAdapter implements ContentStore {
  private readonly files: Map<string, string>

  constructor(files: Record<string, string>) {
    this.files = new Map(Object.entries(files))
  }

  getRaw(relativePath: string): string | undefined {
    return this.files.get(relativePath)
  }

  listSlugs(collection: CollectionName): Array<string> {
    const prefix = `${collection}/`
    return [...this.files.keys()]
      .filter((p) => p.startsWith(prefix) && p.endsWith('.md'))
      .map((p) => p.slice(prefix.length).replace(/\.md$/, ''))
  }
}
