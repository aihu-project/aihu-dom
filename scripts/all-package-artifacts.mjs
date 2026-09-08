import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { verifyPackage } from './verify-pack-contract.mjs'

const root = resolve(import.meta.dirname, '..')
const packageDirs = ['signals', 'reactive', 'arbor', 'dom']
const temp = mkdtempSync(join(tmpdir(), 'aihu-dom-all-artifacts-'))
const packDir = join(temp, 'tarballs')
mkdirSync(packDir)

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    ...options,
  })
}

try {
  const archives = packageDirs.map((directory) =>
    verifyPackage(join(root, 'packages', directory), join(packDir, directory)),
  )
  const expectedVersions = Object.fromEntries(
    packageDirs.map((directory) => {
      const manifest = JSON.parse(
        readFileSync(join(root, 'packages', directory, 'package.json'), 'utf8'),
      )
      return [manifest.name, manifest.version]
    }),
  )
  writeFileSync(
    join(temp, 'package.json'),
    JSON.stringify({ name: 'aihu-dom-all-artifacts', private: true, type: 'module' }),
  )
  run(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-package-lock',
      '--no-audit',
      '--no-fund',
      ...archives,
      'jsdom@25.0.1',
    ],
    {
      cwd: temp,
    },
  )

  writeFileSync(
    join(temp, 'smoke.mjs'),
    `import { JSDOM } from 'jsdom'
const signalsPackage = await import('@aihu/signals')
await import('@aihu/signals/lifecycle')
const reactivePackage = await import('@aihu/reactive')
await import('@aihu/reactive/helpers')
const arborPackage = await import('@aihu/arbor')
await import('@aihu/arbor/hydrate')
await import('@aihu/arbor/progressive')
const domPackage = await import('@aihu/dom')
await import('@aihu/dom/hydrate')
await import('@aihu/dom/progressive')
await import('@aihu/dom/signals')
await import('@aihu/dom/reactive')
const dom = new JSDOM('<!doctype html><html><body></body></html>')
globalThis.window = dom.window
globalThis.document = dom.window.document
const expectedVersions = ${JSON.stringify(expectedVersions)}
for (const [name, version] of Object.entries(expectedVersions)) {
  const manifestText = await import('node:fs/promises').then(({ readFile }) =>
    readFile(new URL('node_modules/' + name + '/package.json', import.meta.url), 'utf8')
  )
  const installed = JSON.parse(manifestText)
  if (installed.version !== version)
    throw new Error(name + ' resolved ' + installed.version + '; expected ' + version)
}
const value = signalsPackage.signal('before')
const host = document.createElement('div')
domPackage.mount(domPackage.branch('p', undefined, [domPackage.leaf(value)]), host)
value[1]('after')
if (host.textContent !== 'after') throw new Error('signal update did not reach the packaged DOM renderer')
if (typeof reactivePackage.reactive !== 'function') throw new Error('reactive entrypoint failed')
if (typeof arborPackage.mount !== 'function') throw new Error('arbor entrypoint failed')
console.log('all packaged DOM-family entrypoints passed')
`,
  )
  process.stdout.write(run(process.execPath, [join(temp, 'smoke.mjs')], { cwd: temp }))
} finally {
  rmSync(temp, { recursive: true, force: true })
}
