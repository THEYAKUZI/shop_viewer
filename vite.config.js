import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DATA_FILE = new URL('./public/DB_GameMaster.json', import.meta.url)

// Fingerprint of the shop data. The app requests DB_GameMaster.json?v=<this>,
// so browsers re-download it only after the data actually changes.
const dataVersion = createHash('md5').update(readFileSync(DATA_FILE)).digest('hex').slice(0, 10)

// The game's data file has ~45 tables; the site reads 7. On build, publish only those
// (and only weapon offers that haven't ended) so visitors download less and less
// unrelated game data is exposed. public/DB_GameMaster.json stays the untouched game file.
function trimShopData() {
  let outDir = 'dist'
  return {
    name: 'trim-shop-data',
    apply: 'build',
    configResolved(config) { outDir = resolve(config.root, config.build.outDir) },
    closeBundle() {
      const src = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
      const now = Date.now()
      const offers = (src.Offers || []).filter(o => o.Tab === 'WEAPON' && new Date(o.EndDate).getTime() > now)
      const offerIds = new Set(offers.map(o => o.Id))
      const trimmed = {
        Exported: src.Exported,
        Hero: src.Hero,
        WeaponItem: src.WeaponItem,
        WeaponAesthetics: src.WeaponAesthetics,
        Modifiers: src.Modifiers,
        LegendaryModifiers: src.LegendaryModifiers,
        Offers: offers,
        OfferDetails: (src.OfferDetails || []).filter(d => offerIds.has(d.OfferId)),
      }
      writeFileSync(`${outDir}/DB_GameMaster.json`, JSON.stringify(trimmed))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), trimShopData()],
  base: '/shop_viewer/',
  define: {
    __DATA_VERSION__: JSON.stringify(dataVersion),
  },
})
