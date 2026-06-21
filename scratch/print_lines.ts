import * as fs from 'fs';

const content = fs.readFileSync('src/app/embudo/page.tsx', 'utf-8');
const lines = content.split('\n');
console.log("Total lines:", lines.length);
for (let i = 625; i < 645; i++) {
  if (lines[i] !== undefined) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
