# Releasing Aihu DOM packages

Publish one package at a time through the guarded command:

```bash
node scripts/publish-package.mjs signals
node scripts/publish-package.mjs reactive
node scripts/publish-package.mjs arbor
node scripts/publish-package.mjs dom
```

The command checks npm before it publishes a dependent. A manifest that raises
an internal dependency range cannot publish until npm serves a matching version.
This is deliberate: local workspaces can resolve code that users cannot yet
install.

The release train across repositories is ordered as follows:

1. Publish `aihu-compiler`, then confirm its npm version resolves.
2. Publish any changed DOM foundation package in dependency order: Signals,
   Reactive or Arbor, then `@aihu/dom`.
3. Release Runtime, UI, applications, and documentation only after a clean
   npm install resolves the compiler and DOM versions they declare.

Every release candidate also needs an isolated packed-artifact smoke test. It
must install tarballs into a fresh temporary directory, never a workspace, and
prove that a signal update renders through `@aihu/dom`. This catches a missing
or stale registry dependency before a consumer release reaches npm.
