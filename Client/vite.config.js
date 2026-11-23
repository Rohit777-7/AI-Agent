import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { transform } from 'lightningcss'

const widgetCssPath = fileURLToPath(new URL('./widget/assistant.css', import.meta.url))

// Serves the embeddable widget's stylesheet at /assistant.css: as-is in
// development, minified in the production build.
const widgetCss = () => ({
  name: 'shifra-widget-css',
  configureServer(server) {
    server.middlewares.use('/assistant.css', (req, res) => {
      res.setHeader('Content-Type', 'text/css; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache')
      res.end(readFileSync(widgetCssPath))
    })
  },
  generateBundle() {
    const { code } = transform({
      filename: 'assistant.css',
      code: readFileSync(widgetCssPath),
      minify: true,
    })

    this.emitFile({ type: 'asset', fileName: 'assistant.css', source: code })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), widgetCss()],
  // In development, forward API calls to the local Express server (Vercel does this in production via vercel.json).
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
