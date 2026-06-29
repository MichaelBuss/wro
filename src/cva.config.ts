import { defineConfig } from 'cva'
import { extendTailwindMerge } from 'tailwind-merge'

// Teach tailwind-merge about the custom type scale defined in styles.css
// (@theme --text-*). Without this, classes like `text-display` are treated as
// text-color and silently dropped when merged alongside `text-foreground`,
// collapsing the whole typographic hierarchy back to the 16px default.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'lead',
            'body',
            'sm-copy',
            'caption',
          ],
        },
      ],
    },
  },
})

export const { cva, cx, compose } = defineConfig({
  hooks: {
    onComplete: (className) => twMerge(className),
  },
})
