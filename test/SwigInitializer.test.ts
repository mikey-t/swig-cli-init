import { WhichResult, emptyDirectory, simpleSpawnAsync, which, withRetryAsync } from '@mikeyt23/node-cli-utils'
import { assertErrorMessageEquals, only, tempDir } from '@mikeyt23/node-cli-utils/testUtils'
import assert from 'node:assert'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { Mock, describe, it } from 'node:test'
import { SwigInitializer, getNodeMajorVersion } from '../src/SwigInitializer.js'

const notUndefined = 'not-undefined'

describe('ensurePreRequisites', () => {
  it('succeeds if min node version is satisfied', async t => {
    const getNodeMajorVersionMock = setupGetNodeMajorVersionMock(t, 20)
    const whichMock = setupWhichMock(t, notUndefined, undefined)
    const swigInit = new SwigInitializer({ whichFn: whichMock, getNodeMajorVersionFn: getNodeMajorVersionMock })

    await swigInit.ensurePreRequisites()
  })
  it('succeeds if node version is not satisfied but Volta is detected', async t => {
    const getNodeMajorVersionMock = setupGetNodeMajorVersionMock(t, 16)
    const whichMock = setupWhichMock(t, notUndefined, notUndefined)
    const swigInit = new SwigInitializer({ whichFn: whichMock, getNodeMajorVersionFn: getNodeMajorVersionMock })

    await swigInit.ensurePreRequisites()
  })
  it('throws if node min version is not satisfied and Volta is not detected', async t => {
    const getNodeMajorVersionMock = setupGetNodeMajorVersionMock(t, 16)
    const whichMock = setupWhichMock(t, notUndefined, undefined)
    const swigInit = new SwigInitializer({ whichFn: whichMock, getNodeMajorVersionFn: getNodeMajorVersionMock })

    await assert.rejects(
      swigInit.ensurePreRequisites(),
      err => assertErrorMessageEquals(err, 'Node.js >= 20 is required (OR Volta must be detected)')
    )
  })
  it('throws if npm is not detected', async t => {
    const getNodeMajorVersionMock = setupGetNodeMajorVersionMock(t, 20)
    const whichMock = setupWhichMock(t, undefined, notUndefined)
    const swigInit = new SwigInitializer({ whichFn: whichMock, getNodeMajorVersionFn: getNodeMajorVersionMock })

    await assert.rejects(
      swigInit.ensurePreRequisites(),
      err => assertErrorMessageEquals(err, 'Npm is required but was not detected')
    )
  })
})

describe('full happy path test from empty directory', only, () => {
  it('works', only, async () => {
    const happyPathDir = path.resolve(tempDir, 'happy-path')
    await deleteHappyPathWithRetry(happyPathDir, '[before test]')

    await new SwigInitializer({ workingDir: happyPathDir }).run()

    const packageJsonPath = path.join(happyPathDir, 'package.json')
    const packageJsonExists = fs.existsSync(packageJsonPath)
    assert.strictEqual(packageJsonExists, true, 'package.json should exist')

    const packageJsonContents = await fsp.readFile(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(packageJsonContents)
    assert.strictEqual(packageJson.type, 'module', 'package.json should have it\'s "type" property set to "module"')

    const voltaPinnedVersion = packageJson.volta?.node ?? undefined
    if (!voltaPinnedVersion) {
      assert.fail('package.json volta node version not detected')
    }
    if (!voltaPinnedVersion.startsWith('20')) {
      assert.fail(`package.json volta node version not the expected version (version found: ${voltaPinnedVersion})`)
    }

    const tsconfigPath = path.join(happyPathDir, 'tsconfig.json')
    const tsconfigExists = fs.existsSync(tsconfigPath)
    assert.strictEqual(tsconfigExists, true, 'tsconfig.json should exist')

    const swigfilePath = path.join(happyPathDir, 'swigfile.ts')
    const swigfileExists = fs.existsSync(swigfilePath)
    assert.strictEqual(swigfileExists, true, 'swigfile.ts should exist')

    const helloOutput = await simpleSpawnAsync('npx', ['swig', 'hello'], { cwd: happyPathDir })
    assert.match(helloOutput.stdout, /hello world!/)

    await deleteHappyPathWithRetry(happyPathDir, '[after test]')
  })
})

async function deleteHappyPathWithRetry(happyPathDir: string, prefix: string) {
  try {
    await withRetryAsync(() => emptyDirectory(happyPathDir, { force: true }), 5, 350, { functionLabel: 'emptyDirectory' })
  } catch (err) {
    console.error(err)
    throw new Error(`${prefix} Could not delete temp/happy-path dir - ensure no other processes including IDEs or terminals have a handle on files in this directory`)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setupGetNodeMajorVersionMock = (testContext: any, version: number) => {
  return testContext.mock.fn(getNodeMajorVersion, () => version)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setupWhichMock = (testContext: any, mockedNpmLocation: string | undefined, mockedVoltaLocation: string | undefined): Mock<((commandName: string) => Promise<WhichResult>) | (() => Promise<WhichResult>)> => {
  const mockedNpmResult: WhichResult = { location: mockedNpmLocation, additionalLocations: undefined, error: undefined }
  const mockedVoltaResult: WhichResult = { location: mockedVoltaLocation, additionalLocations: undefined, error: undefined }

  const whichMock = testContext.mock.fn(which)
  whichMock.mock.mockImplementationOnce(async () => mockedNpmResult, 0)
  whichMock.mock.mockImplementationOnce(async () => mockedVoltaResult, 1)

  return whichMock
}
