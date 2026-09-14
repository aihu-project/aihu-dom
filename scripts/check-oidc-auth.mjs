import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const npmEnvPrefix = /^(?:npm|node)(?:[_-]|$)/i
// Covers auth/token, username/password, email, certfile, and keyfile spellings.
const credentialName =
  /(?:^|[_:/.@-])(?:_?auth(?:[_-]?token)?|token|user(?:[_-]?name)?|pass(?:[_-]?word)?|email|cert(?:[_-]?file)?|key(?:[_-]?file)?)(?:$|[_:/.@-])/i

export function isCredentialEnvironment(name, value) {
  return Boolean(value) && npmEnvPrefix.test(name) && credentialName.test(name)
}

function isCredentialConfigLine(line) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) return false
  const separator = trimmed.indexOf('=')
  if (separator < 0 || !trimmed.slice(separator + 1).trim()) return false
  const key = trimmed
    .slice(0, separator)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  const leaf = key.slice(key.lastIndexOf(':') + 1)
  return /^(?:_?auth(?:_?token)?|token|user(?:_?name)?|pass(?:_?word)?|email|cert(?:_?file)?|key(?:_?file)?)$/.test(
    leaf,
  )
}

export function isSupportedNpmVersion(version) {
  const match =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(
      version,
    )
  if (!match) return false
  const [, major, minor, patch] = match.map(Number)
  return major > 11 || (major === 11 && (minor > 5 || (minor === 5 && patch >= 1)))
}

for (const [name, value] of Object.entries(process.env))
  if (isCredentialEnvironment(name, value))
    throw new Error(
      'classic npm authentication environment is set; trusted publishing requires OIDC',
    )

const paths = new Set([
  '.npmrc',
  process.env.NPM_CONFIG_USERCONFIG,
  process.env.NPM_CONFIG_GLOBALCONFIG,
])
for (const config of [
  ['config', 'get', 'userconfig'],
  ['config', 'get', 'globalconfig'],
])
  try {
    paths.add(execFileSync('npm', config, { encoding: 'utf8' }).trim())
  } catch {}

for (const path of paths) {
  if (!path || !existsSync(path)) continue
  if (readFileSync(path, 'utf8').split(/\r?\n/).some(isCredentialConfigLine))
    throw new Error(
      'classic npm authentication was found in npm config; trusted publishing requires OIDC',
    )
}

const npmVersion = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim()
if (!isSupportedNpmVersion(npmVersion))
  throw new Error(`npm ${npmVersion} must be stable semver >= 11.5.1 for trusted publishing`)
console.log(`verified npm ${npmVersion}, sanitized config, and OIDC-only auth contract`)
