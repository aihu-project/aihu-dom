import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const manifestFields = [
  'name',
  'version',
  'main',
  'module',
  'types',
  'exports',
  'bin',
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
  'os',
  'cpu',
  'libc',
]

// This is deliberately independent of package.json `files`, exports, and the
// current dist tree. A new file requires an intentional release-contract edit;
// injected nested or top-level files must never become publishable by walking
// whatever happens to be present in dist at verification time.
const exactPackageFiles = Object.freeze({
  signals: [
    'package/LICENSE',
    'package/README.md',
    'package/package.json',
    'package/dist/index.d.ts',
    'package/dist/index.d.ts.map',
    'package/dist/index.js',
    'package/dist/index.js.map',
    'package/dist/lifecycle.d.ts',
    'package/dist/lifecycle.d.ts.map',
    'package/dist/lifecycle.js',
    'package/dist/lifecycle.js.map',
  ],
  reactive: [
    'package/LICENSE',
    'package/README.md',
    'package/package.json',
    'package/dist/helpers.d.ts',
    'package/dist/helpers.d.ts.map',
    'package/dist/helpers.js',
    'package/dist/helpers.js.map',
    'package/dist/index.d.ts',
    'package/dist/index.d.ts.map',
    'package/dist/index.js',
    'package/dist/index.js.map',
  ],
  arbor: [
    'package/LICENSE',
    'package/README.md',
    'package/package.json',
    'package/dist/hydrate.d.ts',
    'package/dist/hydrate.d.ts.map',
    'package/dist/hydrate.js',
    'package/dist/hydrate.js.map',
    'package/dist/index.d.ts',
    'package/dist/index.d.ts.map',
    'package/dist/index.js',
    'package/dist/index.js.map',
    'package/dist/mount-AlTgh9U9.js',
    'package/dist/mount-AlTgh9U9.js.map',
    'package/dist/mount-D3aTHMPy.d.ts',
    'package/dist/mount-D3aTHMPy.d.ts.map',
    'package/dist/progressive.d.ts',
    'package/dist/progressive.d.ts.map',
    'package/dist/progressive.js',
    'package/dist/progressive.js.map',
  ],
  dom: [
    'package/LICENSE',
    'package/README.md',
    'package/package.json',
    'package/dist/hydrate.d.ts',
    'package/dist/hydrate.js',
    'package/dist/index.d.ts',
    'package/dist/index.js',
    'package/dist/progressive.d.ts',
    'package/dist/progressive.js',
    'package/dist/reactive.d.ts',
    'package/dist/reactive.js',
    'package/dist/signals.d.ts',
    'package/dist/signals.js',
  ],
})

const number = '(?:0|[1-9]\\d*)'
const fullVersion = `${number}\\.${number}\\.${number}(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?`
const partialVersion = `${number}(?:\\.${number}){0,2}`
const wildcardVersion = `(?:${number}|[xX*])(?:\\.(?:${number}|[xX*])){0,2}`
const rangeAtom = new RegExp(
  `^(?:[v=]\\s*)?(?:(?:[<>]=?|[~^])\\s*)?(?:${fullVersion}|${partialVersion}|${wildcardVersion})$`,
)

function isSemverRange(spec) {
  if (typeof spec !== 'string' || !spec.trim()) return false
  const value = spec.trim()
  if (/^(?:workspace|file|link|git|github|git\\+|https?|ssh|npm):/i.test(value)) return false
  if (/^git@/i.test(value)) return false
  return value.split('||').every((part) => {
    const range = part.trim().replace(/([<>]=?|[~^])\s+/g, '$1')
    if (!range) return false
    const hyphen = range.match(/^(.+?)\s+-\s+(.+)$/)
    if (hyphen) return rangeAtom.test(hyphen[1].trim()) && rangeAtom.test(hyphen[2].trim())
    return range.split(/\s+/).every((atom) => rangeAtom.test(atom))
  })
}

export function assertPublicRegistrySemverDependencies(manifest) {
  for (const section of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [name, spec] of Object.entries(manifest[section] ?? {})) {
      if (!isSemverRange(spec))
        throw new Error(`${section}.${name} must be a public registry semver range`)
    }
  }
}

export function verifyPackage(root, packDir) {
  root = resolve(root)
  packDir = resolve(packDir)
  rmSync(packDir, { recursive: true, force: true })
  mkdirSync(packDir, { recursive: true })
  const source = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  assertPublicRegistrySemverDependencies(source)
  const packed = JSON.parse(
    execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', packDir], {
      cwd: root,
      encoding: 'utf8',
    }),
  )
  if (packed.length !== 1) throw new Error('npm pack did not produce exactly one archive')
  const archive = resolve(packDir, packed[0].filename)
  const archives = readdirSync(packDir).filter((name) => name.endsWith('.tgz'))
  if (!existsSync(archive) || archives.length !== 1 || archives[0] !== packed[0].filename)
    throw new Error('pack directory must contain exactly one archive')
  const got = JSON.parse(
    execFileSync('tar', ['-xOzf', archive, 'package/package.json'], { encoding: 'utf8' }),
  )
  for (const field of manifestFields)
    if (JSON.stringify(got[field]) !== JSON.stringify(source[field]))
      throw new Error(`manifest field ${field} changed in tarball`)
  assertPublicRegistrySemverDependencies(got)
  const entries = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter((entry) => entry && !entry.endsWith('/'))
  const packageDirectory = basename(root)
  const expectedFiles = exactPackageFiles[packageDirectory]
  if (!expectedFiles) throw new Error(`no exact pack allowlist for ${packageDirectory}`)
  const expected = new Set(expectedFiles)
  const actual = new Set(entries)
  for (const file of expected)
    if (!actual.has(file)) throw new Error(`tarball is missing allowlisted file ${file}`)
  for (const file of actual)
    if (!expected.has(file)) throw new Error(`unexpected file in tarball: ${file}`)
  if (
    entries.some((file) =>
      /^package\/(?:src|tests|scripts|node_modules|\.github)(?:\/|$)/.test(file),
    )
  )
    throw new Error('disallowed files leaked into tarball')
  if (process.env.GITHUB_ENV)
    writeFileSync(process.env.GITHUB_ENV, `AIHU_PACK_PATH=${archive}\n`, { flag: 'a' })
  console.log(`verified ${archive}: ${got.name}@${got.version} (${entries.length} files)`)
  return archive
}
