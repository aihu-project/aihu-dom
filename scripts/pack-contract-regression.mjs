import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { verifyPackage } from './verify-pack-contract.mjs'

const root = resolve(import.meta.dirname, '..')
const packageDirs = ['signals', 'reactive', 'arbor', 'dom']

function expectInjectedFileToFail(directory, relativePath) {
  const temp = mkdtempSync(join(root, '.release-contract-regression-'))
  try {
    const source = join(root, 'packages', directory)
    const copy = join(temp, 'packages', directory)
    mkdirSync(dirname(copy), { recursive: true })
    cpSync(source, copy, { recursive: true })
    const injected = join(copy, relativePath)
    mkdirSync(dirname(injected), { recursive: true })
    writeFileSync(injected, 'release-contract injection sentinel\n')
    try {
      verifyPackage(copy, join(temp, 'pack'))
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('unexpected file in tarball:')) return
      throw error
    }
    throw new Error(`${directory} accepted injected ${relativePath}`)
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
}

for (const directory of packageDirs) {
  expectInjectedFileToFail(directory, 'dist/release-contract-injected.js')
  expectInjectedFileToFail(directory, 'dist/release-contract-injected/nested.js')
}

console.log('pack contract rejected top-level and nested dist injections for all four packages')
