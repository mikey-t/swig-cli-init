# swig-cli-init

An npm script to automatically setup a [swig-cli](https://github.com/mikey-t/swig) project in an opinionated way with ESM and typescript support.

## Requirements

- Globally installed Node.js version >= 20

It is also recommended to have [pnpm](https://pnpm.io/installation) globally installed so it can be used instead of npm for installing dev dependencies, but it isn't required.

## Usage

In a terminal, change directory to the one you want swig initialized within.

Then run the following command:

```
// With npx:
npx swig-cli-init@latest

// With pnpx:
pnpx swig-cli-init@latest
```

Verify success by executing sample swig task:
```
// With global swig install
swig hello

// With local swig and npm exec
npm exec swig hello

// With local swig and pnpm exec
pnpm exec swig hello
```

## What the Script Does

The swig-cli-init script performs all these actions in the current directory:

- Creates package.json if not present
- Set package.json type to `module`
- Detect if Node.js is installed globally and meets the minimum version requirement (currently 20)
- Add `tsconfig.json` if not present
- Install dev dependencies with latest versions with `pnpm` if detected and there isn't a package-lock.json file present, otherwise with `npm` (see [Installed Dev Dependencies](#installed-dev-dependencies) section below)
- Create `swigfile.ts` if not present with an example task `hello`

## Installed Dev Dependencies

| Dev Dependency | Notes |
|----------------|-------|
| `swig-cli@latest` | This is required for swig to work. Contains the executable for using local swig install, and includes `series` and `parallel` methods for importing in your `swigfile.ts` to use for automating groups tasks. |
| `typescript@latest` | Ensures typescript is available and set to a specific version. Useful for vscode support as well as referencing a specific known working version of `tsc`. |
| `tsx@latest` | This is what allows swig to execute typescript files directly without transpiling them. If you try and execute a `.ts` swigfile without this installed, swig will output a message stating you need it (or to downgrade from Typescript to plain JavaScript). For documentation, see [tsx repository](https://github.com/privatenumber/tsx). |
| `@mikeyt23/node-cli-utils` | Contains a wide variety of useful functionality. The most used helper method in this package is `spawnAsync` since many automated dev tasks involve spawning processes (like lint, build and test processes for example). For more info check out the [node-cli-utils](https://github.com/mikey-t/node-cli-utils) repository or it's auto-generated documentation at https://mikey-t.github.io/node-cli-utils-docs/. |
| `@types/node@20`    | Typescript type definitions for Node.js - supports vscode intellisense and auto import functionality for importing built-in Node.js functionality. It will pin it to whatever Node.js major version for the currently executing Node.js process (your global installed version). |

## Notes

This script is re-runnable, so it can also act as a dev dependency updater since it installs the latest versions of dev dependencies and skips steps that are already complete.

The [pnpm](https://pnpm.io/installation) package manager is preferred and will be used if it is detected, but it is not required.

Another recommended dev dependency to add is [swig-cli-modules](https://www.npmjs.com/package/swig-cli-modules) (`npm i -D swig-cli-modules@latest` or with pnpm `pnpm i -D swig-cli-modules@latest`). This has useful functionality for automating tasks related to Docker and Entity Framework. The [swig-cli-modules repository](https://github.com/mikey-t/swig-cli-modules) is also a useful source of example swig usage in general. Check out the [DotnetReactSandbox](https://github.com/mikey-t/swig-cli-modules/tree/main/src/modules/DotnetReactSandbox) module for an example of encapsulating automation of a template style project (in this case, [dotnet-react-sandbox](https://github.com/mikey-t/dotnet-react-sandbox)). Check out the project [db-migrations-dotnet](https://github.com/mikey-t/db-migrations-dotnet) for an example of utilizing the [EntityFramework](https://github.com/mikey-t/swig-cli-modules/tree/main/src/modules/EntityFramework) module (specifically, look at [swigfile.ts](https://github.com/mikey-t/db-migrations-dotnet/blob/main/example-solutions/example-postgres/swigfile.ts) in the example project [example-postgres](https://github.com/mikey-t/db-migrations-dotnet/tree/main/example-solutions/example-postgres)).

## Roadmap and Ideas

- Add additional options:
  - Output directory
  - Designate a Node.js version manager and what specific Node.js version to install/use (e.g. mise, nvm, volta)
  - Node and packageManager version pinning via package.json devEngines field
  - Whether or not to include the '@mikeyt23/node-cli-utils' package
- Additional integration tests
