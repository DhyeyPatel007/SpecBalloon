// Checks every sample characteristic in src/data/sampleDrawings.ts:
//  - in_spec must have measuredValue inside [lsl, usl]; out_of_spec must be outside it
//  - thread rows must use ISO 965 pitch-diameter (D2) limits, not mixed major/minor limits
// Usage: node scripts/check-sample-verdicts.mjs   (exit 1 on any failure)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const text = readFileSync(join(root, 'src/data/sampleDrawings.ts'), 'utf8');

// ISO 965 pitch-diameter limits for the thread sizes used in the sample data.
function expectedD2(callout) {
  if (callout.includes('M10') && callout.includes('1.5')) return [9.026, 9.206];
  if (callout.includes('M10') && callout.includes('1.25')) return [9.188, 9.348];
  if (callout.includes('M24') && callout.includes('1.5')) return [22.814, 22.994];
  return null;
}

const blocks = [...text.matchAll(
  /\{\s*id: '(demo-[^']+)',.*?rawCallout: '([^']+)',.*?lsl: ([\d.-]+),.*?usl: ([\d.-]+),.*?measuredValue: ([\d.-]+),.*?status: '([^']+)'/gs,
)];

let failures = 0;
for (const [, id, callout, lslS, uslS, measS, status] of blocks) {
  const lsl = parseFloat(lslS);
  const usl = parseFloat(uslS);
  const meas = parseFloat(measS);
  const inside = meas >= lsl && meas <= usl;
  if (status === 'in_spec' && !inside) {
    console.error(`FAIL ${id} (${callout}): status in_spec but measured ${meas} outside [${lsl}, ${usl}]`);
    failures++;
  }
  if (status === 'out_of_spec' && inside) {
    console.error(`FAIL ${id} (${callout}): status out_of_spec but measured ${meas} inside [${lsl}, ${usl}]`);
    failures++;
  }
  const expected = expectedD2(callout);
  if (expected && (lsl !== expected[0] || usl !== expected[1])) {
    console.error(`FAIL ${id} (${callout}): thread limits [${lsl}, ${usl}] are not ISO 965 D2 limits [${expected[0]}, ${expected[1]}]`);
    failures++;
  }
}

console.log(`checked ${blocks.length} characteristics, ${failures} failure(s)`);
if (failures > 0) process.exit(1);
