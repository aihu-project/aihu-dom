import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const a = process.argv[2]
const packageName = process.argv[3]
if (!a || !packageName)
  throw new Error('usage: node scripts/consumer-smoke.mjs /absolute/path/package.tgz package-dir')
const d = mkdtempSync(join(tmpdir(), `aihu-dom-${packageName}-consumer-`))
execFileSync('npm', ['init', '-y'], { cwd: d, stdio: 'ignore' })
execFileSync(
  'npm',
  ['install', '--ignore-scripts', '--no-package-lock', '--no-audit', '--no-fund', resolve(a)],
  { cwd: d, stdio: 'inherit' },
)
const manifest = JSON.parse(
  readFileSync(
    resolve(new URL(`../packages/${packageName}/package.json`, import.meta.url).pathname),
    'utf8',
  ),
)
execFileSync(
  process.execPath,
  [
    '--input-type=module',
    '-e',
    `const mod = await import(${JSON.stringify(manifest.name)}); if (typeof mod !== 'object') throw new Error('consumer import failed')`,
  ],
  { cwd: d, stdio: 'inherit' },
)
console.log(`isolated consumer passed against ${a}`)
