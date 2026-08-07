/** Markdown imported as HTML. Turned at build time; see the plugin in vite.config.ts. */
declare module '*.md?html' {
  const html: string
  export default html
}
