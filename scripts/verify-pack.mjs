import { resolve } from 'node:path'
import { verifyPackage } from './verify-pack-contract.mjs'

const packageDir = process.argv[2]
if (!packageDir) throw new Error('package directory required')
verifyPackage(resolve('packages', packageDir), process.env.PACK_DIR ?? '.release/pack')
