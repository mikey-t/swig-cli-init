import { Emoji, log, spawnAsync, which } from '@mikeyt23/node-cli-utils'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'

export interface SwigInitializerDependencies {
  whichFn: typeof which
  getNodeMajorVersionFn: typeof getNodeMajorVersion
  workingDir: string
}

export class SwigInitializer {
  static readonly minNodeVersion = 20
  static readonly nodeVersionPin = 20
  private readonly whichFn: typeof which
  private readonly getNodeMajorVersionFn: typeof getNodeMajorVersion
  private readonly workingDir: string

  constructor(dependencies?: Partial<SwigInitializerDependencies>) {
    this.whichFn = dependencies?.whichFn ?? which
    this.getNodeMajorVersionFn = dependencies?.getNodeMajorVersionFn ?? getNodeMajorVersion
    this.workingDir = dependencies?.workingDir ?? process.cwd()
  }

  run = async () => {
    log(`- starting initialization of swig project in directory: ${this.workingDir}`)
    await this.ensurePreRequisites()
    await this.npmInit()
    await this.npmSetTypeModule()
    await this.voltaPinNodeVersion()
    await this.ensureTsconfig()
    await this.installDependencies()
    await this.ensureSwigfile()
    this.printInstructions()
  }

  ensurePreRequisites = async () => {
    log('- ensuring pre-requisites')
    const nodeVersion = this.getNodeMajorVersionFn()
    if (!(await this.whichFn('npm')).location) {
      throw new Error('Npm is required but was not detected')
    }

    if (nodeVersion >= SwigInitializer.minNodeVersion) {
      return
    }

    if (!(await this.whichFn('volta')).location) {
      throw new Error(`Node.js >= ${SwigInitializer.minNodeVersion} is required (OR Volta must be detected)`)
    }
  }

  npmInit = async () => {
    log('- running npm init')
    await spawnAsync('npm', ['init', '-y'], { cwd: this.workingDir })
  }

  npmSetTypeModule = async () => {
    log('- setting package.json type to module with command: npm pkg set type="module"')
    await spawnAsync('npm', ['pkg', 'set', 'type=module'], { cwd: this.workingDir })
  }

  voltaPinNodeVersion = async () => {
    const volta = (await (which('volta'))).location
    if (!volta) {
      return
    }
    log(`- using volta to ping node version to ${SwigInitializer.nodeVersionPin}`)
    await spawnAsync('volta', ['pin', `node@${SwigInitializer.nodeVersionPin}`], { cwd: this.workingDir })
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

  installDependencies = async () => {
    log(`- installing dependencies (if pnpm installed and no package-lock.json, pnpm will be used instead of npm)`)
    const pnpmInstalled = (await which('pnpm')).location !== undefined
    const packageLockPath = path.resolve(this.workingDir, 'package-lock.json')
    const packageLockExists = fs.existsSync(packageLockPath)
    const npmCommand = pnpmInstalled && !packageLockExists ? 'pnpm' : 'npm'
    await spawnAsync(npmCommand, ['i', '-D', 'swig-cli', 'swig-cli-modules', 'tsx', 'typescript', '@mikeyt23/node-cli-utils', '@types/node@20'], { cwd: this.workingDir })
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
    log(`${Emoji.GreenCheck} Swig project setup complete. Next steps:`)
    log(`- Install swig-cli globally: npm i -g swig-cli`)
    log(`- Get a list of available swig tasks: swig`)
    log(`- Run the "hello" task (only generated if swigfile.ts did not already exist): swig hello`)
  }
}

export function getNodeMajorVersion(): number {
  const nodeVersionString = process.versions.node
  return parseInt(nodeVersionString.substring(1, nodeVersionString.indexOf('.')))
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
