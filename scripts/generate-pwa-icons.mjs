import sharp from 'sharp'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))
const publicDir = join(root, '..', 'apps', 'web', 'public')

const svg = await readFile(join(publicDir, 'icon.svg'))

async function png(size, filename, { padding = 0 } = {}) {
  const inner = size - padding * 2
  const buf = await sharp(svg)
    .resize(inner, inner)
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 255, g: 107, b: 53, alpha: 1 },
    })
    .png()
    .toBuffer()
  await writeFile(join(publicDir, filename), buf)
  console.log(` - ${filename} (${size}x${size}${padding ? `, pad ${padding}` : ''})`)
}

console.log('Generating PWA icons...')
await png(192, 'icon-192.png')
await png(512, 'icon-512.png')
// Maskable requiere safe area — padding del 10% (mínimo seguro)
await png(192, 'icon-192-maskable.png', { padding: 20 })
await png(512, 'icon-512-maskable.png', { padding: 52 })
await png(180, 'apple-touch-icon.png')
await png(32, 'favicon-32.png')
await png(16, 'favicon-16.png')

// favicon.ico (usa favicon-32 como fuente)
const icoBuf = await sharp(svg).resize(32, 32).png().toBuffer()
await writeFile(join(publicDir, 'favicon.ico'), icoBuf)
console.log(' - favicon.ico')

console.log('Done!')
