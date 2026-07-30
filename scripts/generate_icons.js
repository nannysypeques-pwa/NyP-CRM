const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Helper to create a basic PNG file using node's built-in zlib
function createPng(width, height, drawFn) {
  const bytesPerPixel = 4;
  const rowSize = width * bytesPerPixel;
  const rawData = Buffer.alloc(height * (rowSize + 1));

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowSize + 1);
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * bytesPerPixel;
      const color = drawFn(x, y, width, height);
      rawData[pxOffset] = color[0];     // R
      rawData[pxOffset + 1] = color[1]; // G
      rawData[pxOffset + 2] = color[2]; // B
      rawData[pxOffset + 3] = color[3]; // A
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type 6 (RGBA)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT Chunk
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4);
  data.copy(buf, 8);
  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc >>> 0, 8 + len);
  return buf;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    for (let j = 0; j < 8; j++) {
      const bit = (crc ^ byte) & 1;
      crc = (crc >>> 1) ^ (bit ? 0xedb88320 : 0);
    }
  }
  return crc ^ -1;
}

// Drawing NyP CRM logo: Brand Teal (#026692) background with rounded corners + white heart & handshake emblem
function drawNyPIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const radius = w * 0.22; // rounded corner radius

  // Check if pixel is within rounded rectangle boundary
  const dx = Math.max(0, Math.abs(x - cx) - (w / 2 - radius));
  const dy = Math.max(0, Math.abs(y - cy) - (h / 2 - radius));
  if (dx * dx + dy * dy > radius * radius) {
    return [0, 0, 0, 0]; // Transparent
  }

  // Base background: #026692 (R:2, G:102, B:146)
  let r = 2, g = 102, b = 146, a = 255;

  // Draw central emblem shape (Heart + Nanny emblem)
  // Distance from center for logo scaling
  const nx = (x - cx) / (w * 0.35);
  const ny = (y - cy) / (h * 0.35);

  // Heart formula: (x^2 + y^2 - 1)^3 - x^2 * y^3 <= 0 (offset slightly up)
  const hx = nx;
  const hy = ny + 0.15;
  const heartEq = Math.pow(hx * hx + hy * hy - 0.55, 3) - hx * hx * Math.pow(hy, 3);

  if (heartEq <= 0) {
    // White heart emblem
    r = 255; g = 255; b = 255; a = 255;

    // Inner heart accent (#5caad0)
    if (heartEq <= -0.15) {
      r = 92; g = 170; b = 208;
    }
  }

  return [r, g, b, a];
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating PWA icons...');

fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), createPng(192, 192, drawNyPIcon));
fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), createPng(512, 512, drawNyPIcon));
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), createPng(180, 180, drawNyPIcon));

// Create SVG Icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <rect width="512" height="512" rx="110" fill="#026692"/>
  <path d="M256 390c-12 0-140-90-140-190 0-50 40-90 90-90 32 0 60 16 75 42 15-26 43-42 75-42 50 0 90 40 90 90 0 100-128 190-140 190z" fill="#ffffff"/>
  <path d="M256 340c-8 0-90-60-90-130 0-32 26-58 58-58 22 0 40 11 50 28 10-17 28-28 50-28 32 0 58 26 58 58 0 70-82 130-90 130z" fill="#5caad0"/>
</svg>`;
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent);

console.log('PWA icons successfully created in public/icons/');
