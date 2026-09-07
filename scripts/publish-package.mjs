import { execFileSync } from 'node:child_process'

const requested = process.argv[2]
if (!requested) throw new Error('Usage: node scripts/publish-package.mjs <package-name>')

execFileSync('node', ['scripts/verify-release-dependencies.mjs', requested], { stdio: 'inherit' })
const name = requested.startsWith('@aihu/') ? requested : `@aihu/${requested}`
execFileSync('npm', ['publish', '--workspace', name, '--access', 'public'], { stdio: 'inherit' })
