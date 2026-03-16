import { emptyDirectory, spawnAsync, withRetryAsync } from '@mikeyt23/node-cli-utils'
import { assertErrorMessageEquals, tempDir } from '@mikeyt23/node-cli-utils/testUtils'
import assert from 'node:assert'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { describe, it } from 'node:test'
import { SwigInitializer, getNodeMajorVersion, getNpmCliJsPath } from '../src/SwigInitializer.js'


describe('ensurePreRequisites', () => {
  it('succeeds if min node version is satisfied', async t => {
    const getNodeMajorVersionMock = setupGetNodeMajorVersionMock(t, 20)
    const swigInit = new SwigInitializer({ getNodeMajorVersionFn: getNodeMajorVersionMock })

    await swigInit.ensurePreRequisites()
  })
  it('throws if node min version is not satisfied', async t => {
    const getNodeMajorVersionMock = setupGetNodeMajorVersionMock(t, 16)
    const swigInit = new SwigInitializer({ getNodeMajorVersionFn: getNodeMajorVersionMock })

    await assert.rejects(
      swigInit.ensurePreRequisites(),
      err => assertErrorMessageEquals(err, `Node.js >= ${SwigInitializer.minNodeVersion} is required`)
    )
  })
})

describe('full happy path test from empty directory', () => {
  it('works', async () => {
    const happyPathDir = path.resolve(tempDir, 'happy-path')
    await deleteHappyPathWithRetry(happyPathDir, '[before test]')

    await new SwigInitializer({ workingDir: happyPathDir }).run()

    const packageJsonPath = path.join(happyPathDir, 'package.json')
    const packageJsonExists = fs.existsSync(packageJsonPath)
    assert.strictEqual(packageJsonExists, true, 'package.json should exist')

    const packageJsonContents = await fsp.readFile(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(packageJsonContents)
    assert.strictEqual(packageJson.type, 'module', 'package.json should have it\'s "type" property set to "module"')

    const tsconfigPath = path.join(happyPathDir, 'tsconfig.json')
    const tsconfigExists = fs.existsSync(tsconfigPath)
    assert.strictEqual(tsconfigExists, true, 'tsconfig.json should exist')

    const swigfilePath = path.join(happyPathDir, 'swigfile.ts')
    const swigfileExists = fs.existsSync(swigfilePath)
    assert.strictEqual(swigfileExists, true, 'swigfile.ts should exist')

    const npmCliJsPath = await getNpmCliJsPath()
    if (!npmCliJsPath) {
      throw new Error('Could not locate npm-cli.js path, cannot run npm exec test')
    }

    const helloOutput = await spawnAsync(process.execPath, [npmCliJsPath, 'exec', 'swig', 'hello'], { cwd: happyPathDir, stdio: 'pipe' })
    assert.match(helloOutput.stdout, /hello world!/)

    await deleteHappyPathWithRetry(happyPathDir, '[after test]')
  })
})

async function deleteHappyPathWithRetry(happyPathDir: string, prefix: string) {
  try {
    await withRetryAsync(() => emptyDirectory(happyPathDir, { force: true }), 5, 350, { functionLabel: 'emptyDirectory' })
  } catch (err) {
    console.error(err)
    throw new Error(`${prefix} Could not delete temp/happy-path dir - ensure no other processes including IDEs or terminals have a handle on files in this directory`, { cause: err })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setupGetNodeMajorVersionMock = (testContext: any, version: number) => {
  return testContext.mock.fn(getNodeMajorVersion, () => version)
}
