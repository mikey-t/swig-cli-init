import { Emoji, emptyDirectory, log, spawnAsync, spawnAsyncLongRunning } from '@mikeyt23/node-cli-utils'
import { series } from 'swig-cli'

const eslintPath = './node_modules/eslint/bin/eslint.js'
const tscPath = './node_modules/typescript/lib/tsc.js'
const tsxArgs = ['--no-warnings', '--import', 'tsx']

export async function lint() {
  await spawnAsync('node', [eslintPath, '--ext', '.ts', './src', 'swigfile.ts'])
}

export async function cleanDist() {
  await emptyDirectory('./dist')
}

export const build = series(cleanDist, doBuild)

export const watch = series(cleanDist, doWatch)

export async function test() {
  const isOnly = argPassed('o')
  if (isOnly) {
    log(`${Emoji.Info} Only running tests marked with 'only'`)
  }

  if ((await spawnAsync('node', [...tsxArgs, ...(isOnly ? ['--test-only'] : []), '--test', 'test/SwigInitializer.test.ts'])).code !== 0) {
    throw new Error('Tests failed')
  }
}

async function doBuild() {
  await spawnAsync('node', [tscPath, '--p', 'tsconfig.build.json'])
}

async function doWatch() {
  await spawnAsyncLongRunning('node', [tscPath, '--p', 'tsconfig.build.json', '--watch'])
}

function argPassed(argName: string) {
  return process.argv.slice(3).includes(argName)
}
