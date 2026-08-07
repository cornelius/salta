import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { marked } from 'marked'
import { defineConfig, type Plugin } from 'vite'

/**
 * `import text from '../docs/rules.de.md?html'` gives the file as HTML, turned
 * at build time so that nothing about Markdown reaches the browser.
 *
 * The rules page shows the two readable rules texts this way rather than keeping
 * a second copy of them: `docs/rules.de.md` and `docs/rules.en.md` are where the
 * transcription and the translation live, and a page that restated them would be
 * a page that drifts from them.
 *
 * The note each file opens with is dropped. It orients someone reading the
 * repository -- which file is which, where the photographs are -- and its links
 * point at paths rather than at anything the page can show; in the page, the
 * switch at the top says the same thing.
 */
function markdown(): Plugin {
  return {
    name: 'salta-markdown',
    async load(id) {
      const [path, query] = id.split('?')
      if (query !== 'html' || path === undefined || !path.endsWith('.md')) return null
      const source = await readFile(path, 'utf8')
      const lines = source.split('\n')
      const note = lines.findIndex((line) => line.startsWith('>'))
      if (note !== -1) {
        let end = note
        while (lines[end]?.startsWith('>') === true) end++
        while (lines[end]?.trim() === '') end++
        lines.splice(note, end - note)
      }
      const html = await marked.parse(lines.join('\n'))
      return `export default ${JSON.stringify(html)}`
    },
  }
}

// GitHub Pages serves the project site from /salta/, so asset URLs must be
// prefixed in a production build. A dev server runs at the root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/salta/' : '/',
  plugins: [markdown()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        rules: resolve(import.meta.dirname, 'rules/index.html'),
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
}))
