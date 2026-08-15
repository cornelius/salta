import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { marked } from 'marked'
import { defineConfig, type Plugin } from 'vite'
import { PIECE_SIZE, pieceMarkup } from './src/render/piece'

/**
 * `import text from '../docs/rules.de.md?html'` gives the file as HTML, turned
 * at build time so that nothing about Markdown reaches the browser.
 *
 * The rules page shows the readable rules texts this way rather than keeping a
 * second copy of them: the `docs/rules.*.md` files are where the transcription
 * and the translations live, and a page that restated them would be a page that
 * drifts from them.
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

/**
 * The favicon: green's one-moon piece, drawn by the code that draws it on the
 * board, so the icon in the tab cannot drift from the set. Generated here rather
 * than checked in, and the link tag is injected into every page for the same
 * reason the figures on the rules page are drawn live.
 */
function favicon(): Plugin {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PIECE_SIZE} ${PIECE_SIZE}">` +
    `${pieceMarkup({ player: 'green', device: 'moon', rank: 1 })}</svg>`
  let base = '/'
  return {
    name: 'salta-favicon',
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml() {
      return [
        {
          tag: 'link',
          attrs: { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` },
          injectTo: 'head',
        },
      ]
    },
    configureServer(server) {
      server.middlewares.use('/favicon.svg', (_req, res) => {
        res.setHeader('Content-Type', 'image/svg+xml')
        res.end(svg)
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'favicon.svg', source: svg })
    },
  }
}

// GitHub Pages serves the project site from /salta/, so asset URLs must be
// prefixed in a production build. A dev server runs at the root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/salta/' : '/',
  plugins: [markdown(), favicon()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        rules: resolve(import.meta.dirname, 'rules/index.html'),
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'rules/**/*.test.ts'],
  },
}))
