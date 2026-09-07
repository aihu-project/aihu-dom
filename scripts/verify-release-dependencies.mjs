import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const requested = process.argv[2]

if (!requested) {
  throw new Error('Usage: node scripts/verify-release-dependencies.mjs <package-name>')
}

const packageDirs = ['signals', 'reactive', 'arbor', 'dom']
const manifests = new Map(
  packageDirs.map((dir) => {
    const manifest = JSON.parse(
      readFileSync(resolve(root, 'packages', dir, 'package.json'), 'utf8'),
    )
    return [manifest.name, manifest]
  }),
)
const name = requested.startsWith('@aihu/') ? requested : `@aihu/${requested}`
const manifest = manifests.get(name)
if (!manifest) throw new Error(`Unknown release package '${requested}'.`)

const ranges = {
  ...(manifest.dependencies ?? {}),
  ...(manifest.peerDependencies ?? {}),
}

const internalDependencies = Object.entries(ranges).filter(([dependency]) =>
  manifests.has(dependency),
)
if (internalDependencies.length === 0) {
  console.log(`${name}: no internal package must publish first.`)
  process.exit(0)
}

for (const [dependency, range] of internalDependencies) {
  try {
    const version = execFileSync('npm', ['view', `${dependency}@${range}`, 'version', '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
    if (!version) throw new Error('npm returned no matching version')
    console.log(`${name}: ${dependency}@${range} is published (${version}).`)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(
      `${name} cannot publish: ${dependency}@${range} is not available from npm. ` +
        `Publish its release wave first, then retry. (${detail})`,
    )
  }
}
