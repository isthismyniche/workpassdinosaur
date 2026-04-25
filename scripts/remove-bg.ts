/**
 * Removes the checkerboard background from the Firefly sprite sheet,
 * then crops into individual mascot frames with proper transparency.
 *
 * Usage: npx tsx scripts/remove-bg.ts
 */
import sharp from 'sharp'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const src = resolve(root, 'dino_images/Firefly_Gemini Flash_1.png')

// Load raw pixels (no alpha on source, so we'll add it)
const { data: rawData, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const { width, height, channels } = info // channels = 4 (RGBA)
const pixels = new Uint8ClampedArray(rawData)

// Flood-fill from image edges to find the checkerboard background.
// The checkerboard alternates between:
//   light grey: ~(191-195, 191-195, 190-193)
//   white:      ~(248-255, 248-255, 248-255)

function isBackground(r: number, g: number, b: number): boolean {
  // White squares
  if (r >= 240 && g >= 240 && b >= 240) return true
  // Light grey squares
  if (r >= 180 && r <= 205 && g >= 180 && g <= 205 && b >= 178 && b <= 205
      && Math.abs(r - g) < 10 && Math.abs(g - b) < 10) return true
  return false
}

const W = width
const H = height
const visited = new Uint8Array(W * H)
const isBg = new Uint8Array(W * H)
const queue: number[] = []

function seed(idx: number) {
  const pi = idx * channels
  if (!visited[idx] && isBackground(pixels[pi], pixels[pi + 1], pixels[pi + 2])) {
    visited[idx] = 1
    isBg[idx] = 1
    queue.push(idx)
  }
}

// Seed from all four edges
for (let x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x) }
for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1) }

// BFS flood fill
while (queue.length > 0) {
  const idx = queue.shift()!
  const x = idx % W, y = Math.floor(idx / W)
  for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const nx = x + dx, ny = y + dy
    if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue
    const ni = ny * W + nx
    if (visited[ni]) continue
    const pi = ni * channels
    if (isBackground(pixels[pi], pixels[pi + 1], pixels[pi + 2])) {
      visited[ni] = 1
      isBg[ni] = 1
      queue.push(ni)
    }
  }
}

// Apply: set background pixels to fully transparent
for (let i = 0; i < W * H; i++) {
  if (isBg[i]) pixels[i * channels + 3] = 0
}

// Reconstruct a full RGBA image
const fullRgba = await sharp(Buffer.from(pixels), { raw: { width: W, height: H, channels: 4 as const } })
  .png()
  .toBuffer()

// Now crop into quadrants and export
const hw = Math.floor(W / 2)
const hh = Math.floor(H / 2)

const frames = [
  { name: 'neutral',  left: 0,  top: 0  },
  { name: 'happy',    left: hw, top: 0  },
  { name: 'sad',      left: 0,  top: hh },
  { name: 'thinking', left: hw, top: hh },
]

console.log(`Source: ${W}×${H} → four ${hw}×${hh} frames`)

for (const frame of frames) {
  const webpOut = resolve(root, `public/mascot/${frame.name}.webp`)
  const pngOut  = resolve(root, `public/mascot/${frame.name}.png`)

  // Extract quadrant, trim transparency, save to intermediate buffer
  const trimmedBuf = await sharp(fullRgba)
    .extract({ left: frame.left, top: frame.top, width: hw, height: hh })
    .trim({ threshold: 5, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  await sharp(trimmedBuf).resize({ width: 400, withoutEnlargement: true }).webp({ quality: 85, effort: 4 }).toFile(webpOut)
  await sharp(trimmedBuf).resize({ width: 400, withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile(pngOut)

  const webpMeta = await sharp(webpOut).metadata()
  const pngMeta  = await sharp(pngOut).metadata()
  const wStat = (await import('fs')).statSync(webpOut)
  const pStat = (await import('fs')).statSync(pngOut)
  console.log(`  ${frame.name}: ${webpMeta.width}×${webpMeta.height}, webp ${Math.round(wStat.size/1024)}KB (${webpMeta.hasAlpha ? 'alpha ✓' : 'NO ALPHA'}), png ${Math.round(pStat.size/1024)}KB (${pngMeta.hasAlpha ? 'alpha ✓' : 'NO ALPHA'})`)
}

console.log('\nDone.')
