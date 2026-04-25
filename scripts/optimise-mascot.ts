/**
 * One-shot script: converts source PNGs in dino_images/ to optimised WebP + PNG
 * in public/mascot/. Run after adding new source images.
 *
 * Usage: npx tsx scripts/optimise-mascot.ts
 */
import sharp from 'sharp'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const FRAMES: { src: string; name: string; width: number }[] = [
  { src: 'dino_images/Work Pass Dinosaur sample image.png', name: 'hero', width: 800 },
  { src: 'dino_images/happy_dino_1.png', name: 'happy', width: 400 },
  { src: 'dino_images/sad_dino_1.png', name: 'sad', width: 400 },
  { src: 'dino_images/neutral_dino.png', name: 'neutral', width: 600 },
  { src: 'dino_images/thinking_dino.png', name: 'thinking', width: 600 },
]

for (const frame of FRAMES) {
  const src = resolve(root, frame.src)
  const webpOut = resolve(root, `public/mascot/${frame.name}.webp`)
  const pngOut = resolve(root, `public/mascot/${frame.name}.png`)

  await sharp(src).resize({ width: frame.width, withoutEnlargement: true }).webp({ quality: 85 }).toFile(webpOut)
  await sharp(src).resize({ width: frame.width, withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile(pngOut)

  const webpStat = (await import('fs')).statSync(webpOut)
  const pngStat = (await import('fs')).statSync(pngOut)
  console.log(`${frame.name}: webp ${Math.round(webpStat.size / 1024)}KB, png ${Math.round(pngStat.size / 1024)}KB`)
}

console.log('Done — public/mascot/ updated.')
