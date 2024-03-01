# swig-cli-init

An npm script to setup a [swig-cli](https://github.com/mikey-t/swig) project in an opinionated way with ESM and typescript support.

## Requirements

Node.js >= 20 or [Volta](https://docs.volta.sh/guide/getting-started).

[Pnpm](https://pnpm.io/installation) is also recommended, but not required.

## Script Setup Actions

- Create package.json if not present
- Set package.json type to `module`
- Detect valid Node.js version (>= 20)
  - If Volta detected, run `volta pin node@20`
  - If Node.js version is less than 20, throw an error stating the requirement
- Add tsconfig.json if not present
- Detect if pnpm is installed
- Install dev dependencies, latest versions (using pnpm, if detected):
  - swig-cli
  - typescript
  - tsx
  - @mikeyt23/node-cli-utils
  - @types/node@20
- Create `swigfile.ts` if not present

## Usage

Run this command in the directory you want your swig project initialized in:

```
npx swig-cli-init@latest
```

## Notes

This script is re-runnable, so it can also act as an updater since it installs the latest versions of dev dependencies and skips steps that are already complete.

The [pnpm](https://pnpm.io/installation) package manager is preferred and will be used if it is detected as installed, but it not required.

## Roadmap and Ideas

- Add additional options:
  - Output directory
  - Which Node package manager to use
  - ESM vs CommonJS
  - Typescript vs vanilla javascript
  - Tsx vs ts-node for typescript loader
  - Specific version of Node
  - Whether or not to include the Node types
  - Whether or not to include the '@mikeyt23/node-cli-utils' package
  - Whether or not to include swig-cli-modules
- Additional integration tests
