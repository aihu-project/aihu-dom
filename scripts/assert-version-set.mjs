import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const expected = {
  '@aihu/signals': '0.5.2',
  '@aihu/reactive': '0.2.2',
  '@aihu/arbor': '4.1.3',
  '@aihu/dom': '0.1.1',
}
const directories = {
  '@aihu/signals': 'signals',
  '@aihu/reactive': 'reactive',
  '@aihu/arbor': 'arbor',
  '@aihu/dom': 'dom',
}
const manifests = new Map()

for (const [name, directory] of Object.entries(directories)) {
  const manifest = JSON.parse(
    readFileSync(resolve(root, 'packages', directory, 'package.json'), 'utf8'),
  )
  if (manifest.name !== name) throw new Error(`${directory} manifest is named ${manifest.name}`)
  if (manifest.version !== expected[name])
    throw new Error(`${name} must be ${expected[name]}, found ${manifest.version}`)
  manifests.set(name, manifest)
}

const ranges = [
  ['@aihu/reactive', 'dependencies', '@aihu/signals'],
  ['@aihu/arbor', 'peerDependencies', '@aihu/signals'],
  ['@aihu/dom', 'dependencies', '@aihu/arbor'],
  ['@aihu/dom', 'dependencies', '@aihu/reactive'],
  ['@aihu/dom', 'dependencies', '@aihu/signals'],
]
for (const [consumer, section, dependency] of ranges) {
  const actual = manifests.get(consumer)[section]?.[dependency]
  const expectedRange = `^${expected[dependency]}`
  if (actual !== expectedRange) {
    throw new Error(
      `${consumer}.${section}.${dependency} must be ${expectedRange}, found ${actual}`,
    )
  }
}

console.log(
  `version set is consistent: ${Object.entries(expected)
    .map(([name, version]) => `${name}@${version}`)
    .join(', ')}`,
)
