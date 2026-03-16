import { Emoji, log, simpleSpawnAsync, spawnAsync } from '@mikeyt23/node-cli-utils'
import fs, { existsSync } from 'node:fs'
import fsp from 'node:fs/promises'
import path, { dirname } from 'node:path'

export interface SwigInitializerDependencies {
  getNodeMajorVersionFn: typeof getNodeMajorVersion
  workingDir: string
}

export class SwigInitializer {
  static readonly minNodeVersion = 20
  private readonly getNodeMajorVersionFn: typeof getNodeMajorVersion
  private readonly workingDir: string
  private npmCliJsPath: string | undefined = undefined
  private nodeMajorVersion: number | undefined = undefined

  constructor(dependencies?: Partial<SwigInitializerDependencies>) {
    this.getNodeMajorVersionFn = dependencies?.getNodeMajorVersionFn ?? getNodeMajorVersion
    this.workingDir = dependencies?.workingDir ?? process.cwd()
  }

  run = async () => {
    log(`- starting swig initialization in directory: ${this.workingDir}`)
    await this.ensurePreRequisites()
    await this.npmInit()
    await this.npmSetTypeModule()
    await this.ensureTsconfig()
    await this.installDevelopmentDependencies()
    await this.ensureSwigfile()
    this.printInstructions()
  }

  ensurePreRequisites = async () => {
    log('- ensuring pre-requisites')
    this.nodeMajorVersion = this.getNodeMajorVersionFn()
    this.npmCliJsPath = getNpmCliJsPath()

    if (!this.npmCliJsPath) {
      throw new Error('npm is required but was not detected')
    }

    if (this.nodeMajorVersion < SwigInitializer.minNodeVersion) {
      throw new Error(`Node.js >= ${SwigInitializer.minNodeVersion} is required`)
    }
  }

  npmInit = async () => {
    const packageJsonPath = path.join(this.workingDir, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      log(`- skipping "npm init -y" step because package.json already exists`)
      return
    }
    log('- running "npm init -y"')
    await this.spawnNpm(['init', '-y'])
  }

  npmSetTypeModule = async () => {
    log('- setting package.json type to module with command: npm pkg set type="module"')
    await this.spawnNpm(['pkg', 'set', 'type=module'])
  }

  npmSetPackageJsonPnpmEsbuildAllow = async () => {
    log(`- adding package.json entry to allow esbuild install script when using pnpm (dependency of tsx)`)
    const getResult = await spawnAsync(process.execPath, [this.npmCliJsPath!, ...['pkg', 'get', 'pnpm.onlyBuiltDependencies']], { cwd: this.workingDir, stdio: 'pipe' })
    const config = JSON.parse(getResult.stdout)
    if ((Array.isArray(config) && config.includes('esbuild')) || config === 'esbuild') {
      log(`- package.json pnpm.onlyBuiltDependencies detected to already exist and already has needed 'esbuild' entry`)
    } else {
      await this.spawnNpm(['pkg', 'set', 'pnpm.onlyBuiltDependencies[]=esbuild'])
    }
  }

  ensureTsconfig = async () => {
    log('- ensuring tsconfig.json exists')
    const tsconfigPath = path.resolve(this.workingDir, 'tsconfig.json')
    if (fs.existsSync(tsconfigPath)) {
      log('- tsconfig.json already exists, skipping')
      return
    }
    await fsp.writeFile(tsconfigPath, tsconfigContent, 'utf-8')
    log('- tsconfig.json written')
  }

  installDevelopmentDependencies = async () => {
    log(`- installing development dependencies (uses pnpm instead of npm if it's installed and no package-lock.json exists)`)
    log('- checking if pnpm is installed globally')
    const npmPackageLockFilename = 'package-lock.json'
    const pnpmInstalled = await this.isPnpmInstalledGlobally()
    const npmPackageLockExists = fs.existsSync(path.resolve(this.workingDir, npmPackageLockFilename))
    const usePnpm = pnpmInstalled && !npmPackageLockExists
    if (pnpmInstalled && npmPackageLockExists) {
      log(`- pnpm was found but '${npmPackageLockFilename}' exists, which means npm is probably already in use - continuing with npm instead of pnpm`)
    } else {
      log(pnpmInstalled ? '- pnpm found - using pnpm instead of npm' : '- pnpm not found - continuing with npm')
    }
    const npmSpawnArgs = [
      'i',
      '-D',
      'swig-cli@latest',
      'swig-cli-modules@latest',
      'tsx@latest',
      'typescript@latest',
      '@mikeyt23/node-cli-utils@latest',
      `@types/node@${this.nodeMajorVersion || SwigInitializer.minNodeVersion}`
    ]
    if (usePnpm) {
      await this.npmSetPackageJsonPnpmEsbuildAllow()
      log('- running pnpm install')
      await spawnAsync('pnpm', npmSpawnArgs, { cwd: this.workingDir })
    } else {
      log('- running npm install')
      await this.spawnNpm(npmSpawnArgs)
    }
  }

  ensureSwigfile = async () => {
    log(`- creating swigfile.ts if it doesn't exist`)
    const swigfilePath = path.resolve(this.workingDir, 'swigfile.ts')
    if (fs.existsSync(swigfilePath)) {
      log('- swigfile.ts already exists - skipping')
      return
    }
    await fsp.writeFile(swigfilePath, swigfileContent, 'utf-8')
    log('- swigfile.ts written')
  }

  printInstructions = () => {
    log(`\n${Emoji.GreenCheck} Swig project setup complete. Next steps:`)
    log(`- Optionally, install swig-cli globally with npm: "npm i -g swig-cli@latest" or pnpm: "pnpm i -g swig-cli@latest"`)
    log(`- Get a list of available swig tasks by running from project directory:`)
    log(`  - With global install: swig`)
    log(`  - With local install and npm: npm exec swig`)
    log(`  - With local install and pnpm: pnpm exec swig`)
    log(`- Try it out by running the "hello" task (only generated if swigfile.ts did not already exist):`)
    log(`  - With global install: swig hello`)
    log(`  - With local install and npm: npm exec swig hello`)
    log(`  - With local install and pnpm: pnpm exec swig hello`)
    log(`- Starting adding new swig tasks by creating exported async function in swigfile.ts`)
  }

  private spawnNpm = async (npmSpawnArgs: string[]) => {
    await spawnAsync(process.execPath, [this.npmCliJsPath!, ...npmSpawnArgs], { cwd: this.workingDir })
  }

  private isPnpmInstalledGlobally = async () => {
    const result = await simpleSpawnAsync('pnpm', ['--version'], { throwOnNonZero: false })
    return result.code === 0 && result.stdout.trim() !== ''
  }
}

// Simply spawning "npm" results in "Error: Command or path not found: npm". Changing it to "npm.cmd" results
// in error "Error: spawn EINVAL" without shell option, but adding shell option causes warning about spawning
// cmd being deprecated. Options are to use this node-cli.js path (i.e. "node.exe [node-path]/node_modules/npm/bin/npm-cli.js [rest of npm commands here]")
// OR to detect if windows and use npm.ps1, though there may be other gotchas with that approach. The advantage of using
// npm-cli.js is that it doesn't require anything in the path and automatically uses the appropriate version of npm that
// is packaged with the current executing version of nodejs.
export function getNpmCliJsPath(): string | undefined {
  const nodeDir = dirname(process.execPath)
  const potentialRelativePaths = [
    './node_modules/npm/bin/npm-cli.js',
    '../node_modules/npm/bin/npm-cli.js',
    '../lib/node_modules/npm/bin/npm-cli.js'
  ]

  for (const p of potentialRelativePaths) {
    const fullPath = path.join(nodeDir, p)
    if (existsSync(fullPath)) {
      return fullPath
    }
  }

  return undefined
}

export function getNodeMajorVersion(): number {
  const nodeVersionString = process.versions.node
  const startIndex = nodeVersionString.length > 0 && nodeVersionString[0].toLowerCase() === 'v' ? 1 : 0
  const version = parseInt(nodeVersionString.substring(startIndex, nodeVersionString.indexOf('.')))
  return version
}

const tsconfigContent = `{
  "compilerOptions": {
    "target": "ESNext",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "types": [
      "node"
    ],
    "noEmit": true,
    "baseUrl": ".",
    "rootDir": "."
  },
  "include": [
    "swigfile.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
`

const swigfileContent = `export async function hello() {
  console.log('hello world!')
}
`
