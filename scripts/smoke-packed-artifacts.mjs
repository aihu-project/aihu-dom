import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const temp = mkdtempSync(join(tmpdir(), 'aihu-dom-artifact-'))
const tarballs = join(temp, 'tarballs')
mkdirSync(tarballs)

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    ...options,
  })
}

try {
  const packages = ['signals', 'reactive', 'arbor', 'dom']
  const tarballPaths = packages.map((directory) => {
    const output = run('npm', ['pack', '--pack-destination', tarballs], {
      cwd: join(root, 'packages', directory),
    }).trim()
    const filename = output.split(/\s+/).at(-1)
    if (!filename) throw new Error(`npm pack did not return a tarball for ${directory}`)
    return join(tarballs, filename)
  })

  writeFileSync(
    join(temp, 'package.json'),
    JSON.stringify({ name: 'aihu-dom-artifact-smoke', private: true, type: 'module' }),
  )
  run('npm', ['install', '--ignore-scripts', ...tarballPaths, 'jsdom@25.0.1'], { cwd: temp })

  writeFileSync(
    join(temp, 'smoke.mjs'),
    `import { JSDOM } from 'jsdom'
import { branch, leaf, mount } from '@aihu/dom'
import { signal } from '@aihu/dom/signals'
const dom = new JSDOM('<!doctype html><html><body></body></html>')
globalThis.window = dom.window
globalThis.document = dom.window.document
const host = document.createElement('div')
const value = signal('before')
mount(branch('p', undefined, [leaf(value)]), host)
value[1]('after')
if (host.textContent !== 'after') throw new Error('signal update did not reach the packaged DOM renderer')
`,
  )
  run(process.execPath, [join(temp, 'smoke.mjs')], { cwd: temp })
  console.log('Packed-artifact smoke test passed.')
} finally {
  rmSync(temp, { recursive: true, force: true })
}
