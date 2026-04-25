/**
 * Crops the Firefly sprite sheet (2×2 grid) into individual mascot frames.
 * Usage: npx tsx scripts/extract-sprite-sheet.ts
 */
import sharp from 'sharp'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const src = resolve(root, 'dino_images/Firefly_Gemini Flash_1.png')

const meta = await sharp(src).metadata()
const w = meta.width!
const h = meta.height!
const hw = Math.floor(w / 2)
const hh = Math.floor(h / 2)

console.log(`Source: ${w}×${h} — cropping into four ${hw}×${hh} quadrants`)

const frames = [
  { name: 'neutral',   left: 0,  top: 0  },
  { name: 'happy',     left: hw, top: 0  },
  { name: 'sad',       left: 0,  top: hh },
  { name: 'thinking',  left: hw, top: hh },
]

for (const frame of frames) {
  const cropped = sharp(src).extract({ left: frame.left, top: frame.top, width: hw, height: hh })

  // Trim transparent edges for a tighter bounding box
  const trimmed = cropped.trim({ threshold: 10 })

  const webpOut = resolve(root, `public/mascot/${frame.name}.webp`)
  const pngOut  = resolve(root, `public/mascot/${frame.name}.png`)

  // Use near-lossless WebP to preserve alpha
  await trimmed.clone().resize({ width: 400, withoutEnlargement: true }).webp({ nearLossless: true, quality: 85 }).toFile(webpOut)
  await trimmed.clone().resize({ width: 400, withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile(pngOut)

  const { format: wf } = await sharp(webpOut).metadata()
  console.log(`  ${frame.name}: ${wf} → ${webpOut.split('/').slice(-2).join('/')}`)
}

console.log('\nDone — public/mascot/ updated with Firefly frames.')
