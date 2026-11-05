import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

// Fingerprint of the shop data. The app requests DB_GameMaster.json?v=<this>,
// so browsers re-download it only after the data actually changes.
const dataVersion = createHash('md5')
  .update(readFileSync(new URL('./public/DB_GameMaster.json', import.meta.url)))
  .digest('hex')
  .slice(0, 10)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/shop_viewer/',
  define: {
    __DATA_VERSION__: JSON.stringify(dataVersion),
  },
})
