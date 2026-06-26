const fs = require('fs');
const path = require('path');

const imgPath = "C:\\Users\\Gerardo Pineda\\.gemini\\antigravity\\brain\\f659baf8-eae9-4d57-a8f9-7b9796e714c8\\media__1782435130875.png";

try {
  const buffer = fs.readFileSync(imgPath);
  // PNG signature is 8 bytes, IHDR chunk is 4 bytes length, 4 bytes type (IHDR), then 4 bytes width, 4 bytes height.
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  console.log(`Dimensions: ${width}x${height}`);
} catch (e) {
  console.error("Error reading PNG:", e);
}
