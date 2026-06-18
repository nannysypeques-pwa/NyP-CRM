import * as fs from 'fs';

const content = fs.readFileSync('src/lib/openai.ts', 'utf-8');
const lines = content.split('\n');
console.log("Total lines:", lines.length);
for (let i = 690; i < 735; i++) {
  if (lines[i] !== undefined) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
