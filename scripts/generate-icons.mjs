/**
 * Generates placeholder app icons — the Kaap terracotta dot on the deep-green
 * brand field. No image deps — writes PNGs (and an ICO-wrapped PNG favicon)
 * directly. TODO: replace with real designed app icons.
 *
 * Outputs: public/icons/icon-{192,512}.png, app/apple-icon.png, app/favicon.ico
 * Run: node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FOREST = [44, 74, 59];
const TERRACOTTA = [207, 106, 63];

function crc32(buf) {
  let c,
    crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function makeIcon(size) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.26;
  // Raw image data: each row prefixed with filter byte 0, then RGBA quads
  // (RGBA because ICO consumers, incl. Next's decoder, require an alpha channel).
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 4);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      // 1px soft edge on the dot
      const t = Math.min(1, Math.max(0, r - d + 0.5));
      const px = row + 1 + x * 4;
      for (let i = 0; i < 3; i++) {
        raw[px + i] = Math.round(FOREST[i] + (TERRACOTTA[i] - FOREST[i]) * t);
      }
      raw[px + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: truecolour with alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Wraps a PNG in a single-image ICO container (supported by all modern browsers). */
function makeIco(size) {
  const png = makeIcon(size);
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count
  header[6] = size < 256 ? size : 0; // width (0 = 256)
  header[7] = size < 256 ? size : 0; // height
  header.writeUInt16LE(1, 12); // colour planes
  header.writeUInt16LE(32, 14); // bits per pixel
  header.writeUInt32LE(png.length, 16);
  header.writeUInt32LE(22, 18); // image data offset
  return Buffer.concat([header, png]);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(join(outDir, `icon-${size}.png`), makeIcon(size));
  console.log(`Wrote icon-${size}.png`);
}
writeFileSync(join(root, "app", "apple-icon.png"), makeIcon(180));
console.log("Wrote app/apple-icon.png");
writeFileSync(join(root, "app", "favicon.ico"), makeIco(48));
console.log("Wrote app/favicon.ico");
