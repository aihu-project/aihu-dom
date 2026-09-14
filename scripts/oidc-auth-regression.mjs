import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { delimiter, join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const check = resolve(root, 'scripts/check-oidc-auth.mjs')
const temp = mkdtempSync(join(root, '.oidc-auth-regression-'))
const home = join(temp, 'home')
const project = join(temp, 'project')
const bin = join(temp, 'bin')
const userConfig = join(temp, 'user.npmrc')
const globalConfig = join(temp, 'global.npmrc')
mkdirSync(home, { recursive: true })
mkdirSync(project, { recursive: true })
mkdirSync(bin, { recursive: true })
const fakeNpm = join(bin, 'npm')
writeFileSync(
  fakeNpm,
  `#!/bin/sh
case "$1 $2 $3" in
  "config get userconfig") printf '%s\\n' "\${NPM_CONFIG_USERCONFIG:-$HOME/.npmrc}" ;;
  "config get globalconfig") printf '%s\\n' "\${NPM_CONFIG_GLOBALCONFIG:-$HOME/.npm-globalrc}" ;;
  "--version  ") printf '%s\\n' "\${FAKE_NPM_VERSION:-11.5.1}" ;;
  *) exit 2 ;;
esac
`,
)
chmodSync(fakeNpm, 0o755)

const credentialName =
  /(?:^|[_:/.@-])(?:_?auth(?:[_-]?token)?|token|user(?:[_-]?name)?|pass(?:[_-]?word)?|email|cert(?:[_-]?file)?|key(?:[_-]?file)?)(?:$|[_:/.@-])/i

function cleanEnv() {
  const env = { ...process.env }
  for (const name of Object.keys(env)) {
    if (/^(?:npm|node)(?:[_-]|$)/i.test(name) && credentialName.test(name)) delete env[name]
  }
  env.HOME = home
  env.NPM_CONFIG_USERCONFIG = userConfig
  env.NPM_CONFIG_GLOBALCONFIG = globalConfig
  env.PATH = `${bin}${delimiter}${process.env.PATH ?? ''}`
  env.FAKE_NPM_VERSION = '11.5.1'
  return env
}

function clearConfigs() {
  for (const path of [join(project, '.npmrc'), join(home, '.npmrc'), userConfig, globalConfig])
    rmSync(path, { force: true })
}

function run(env = cleanEnv()) {
  return spawnSync(process.execPath, [check], {
    cwd: project,
    env,
    encoding: 'utf8',
  })
}

function expectStatus(label, expected, result) {
  const passed = expected ? result.status === 0 : result.status !== 0
  if (!passed)
    throw new Error(
      `${label} had unexpected status ${result.status}: ${result.stderr || result.stdout}`,
    )
}

try {
  clearConfigs()
  expectStatus('clean OIDC environment', true, run())

  const envNames = [
    'NPM_TOKEN',
    'NODE_AUTH_TOKEN',
    'NPM_CONFIG_AUTH_TOKEN',
    'npm_config_auth-token',
    'NPM_CONFIG__AUTH',
    'NPM_CONFIG_USERNAME',
    'NPM_CONFIG_USER_NAME',
    'NPM_CONFIG_PASSWORD',
    'NPM_CONFIG_PASS-WORD',
    'NPM_CONFIG_EMAIL',
    'NPM_CONFIG_CERTFILE',
    'NPM_CONFIG_KEY-FILE',
    'NPM_CONFIG_//registry.npmjs.org/:_authToken',
  ]
  for (const name of envNames) {
    const env = cleanEnv()
    env[name] = 'sentinel'
    expectStatus(`credential environment ${name}`, false, run(env))
    env[name] = ''
    expectStatus(`empty credential environment ${name}`, true, run(env))
  }

  const configCases = [
    ['project npmrc', join(project, '.npmrc'), '_authToken=sentinel'],
    ['default user npmrc', join(home, '.npmrc'), 'username=sentinel'],
    ['explicit user npmrc', userConfig, 'password=sentinel'],
    ['global npmrc', globalConfig, '//registry.npmjs.org/:_auth-token=sentinel'],
  ]
  for (const [label, path, line] of configCases) {
    clearConfigs()
    writeFileSync(path, `${line}\n`)
    const env = cleanEnv()
    if (label === 'default user npmrc') delete env.NPM_CONFIG_USERCONFIG
    expectStatus(label, false, run(env))
  }
  clearConfigs()
  writeFileSync(join(project, '.npmrc'), '_authToken=\n')
  expectStatus('empty npmrc credential', true, run())

  const versions = [
    ['11.5.1', true],
    ['11.5.2', true],
    ['11.5.1+build.1', true],
    ['12.0.0', true],
    ['11.5.0', false],
    ['11.5.1-beta.1', false],
    ['11.5.1-0', false],
    ['v11.5.1', false],
    ['11.05.1', false],
  ]
  for (const [version, expected] of versions) {
    clearConfigs()
    const env = cleanEnv()
    env.FAKE_NPM_VERSION = version
    expectStatus(`npm ${version}`, expected, run(env))
  }
} finally {
  rmSync(temp, { recursive: true, force: true })
}

console.log('OIDC auth and stable npm-version regression matrix passed')
