// Runs the tests (npm test), or records the baseline as it is now (npm run baseline). On Windows, a terminal opened on
// "c:\" instead of "C:\" makes Vitest load itself twice and find no tests, so the folder's real name is used.
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2), baseline = args[0] === '--baseline';
const root = realpathSync.native(dirname(dirname(fileURLToPath(import.meta.url))));
process.chdir(dirname(root)); // (moving to a folder that only differs in case doesn't count as moving)
process.chdir(root);
const r = spawnSync(process.execPath, [join(root, 'node_modules/vitest/vitest.mjs'), 'run', ...(baseline ? ['tests/baseline.test.ts'] : args)], { cwd: root, stdio: 'inherit', env: { ...process.env, ...(baseline ? { UPDATE_BASELINE: '1' } : {}) } });
process.exit(r.status ?? 1);
