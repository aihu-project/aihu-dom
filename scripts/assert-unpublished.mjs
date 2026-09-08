import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const packageDir = process.argv[2]
if (!packageDir) throw new Error('package directory required')
const p = JSON.parse(
  readFileSync(new URL(`../packages/${packageDir}/package.json`, import.meta.url)),
)
const spec = `${p.name}@${p.version}`
const r = spawnSync(
  'npm',
  ['view', spec, 'version', '--json', '--registry=https://registry.npmjs.org'],
  { encoding: 'utf8' },
)
const o = `${r.stdout ?? ''}\n${r.stderr ?? ''}`
if (r.status === 0) throw new Error(`${spec} already exists on npm; refusing to publish over it`)
const codes = [...o.matchAll(/(?:npm )?error code (E\d+)/gi)].map((m) => m[1].toUpperCase())
if (
  !/E404|No match found for version/i.test(o) ||
  codes.some((c) => c !== 'E404') ||
  /ECONN|ETIMEDOUT|ENETUNREACH|EAI_AGAIN/i.test(o)
)
  throw new Error(`npm absence check did not fail closed with E404 for ${spec}`)
console.log(`confirmed E404-only absence for ${spec}`)
