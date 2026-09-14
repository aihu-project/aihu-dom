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

The next DOM-family release set is intentionally coordinated across the four
packages:

| Publish order | Package | Tag | Version | Registry prerequisite |
| ---: | --- | --- | --- | --- |
| 1 | `@aihu/signals` | `signals-v0.5.2` | `0.5.2` | none |
| 2 | `@aihu/reactive` | `reactive-v0.2.2` | `0.2.2` | `@aihu/signals@0.5.2` |
| 2 | `@aihu/arbor` | `arbor-v4.1.3` | `4.1.3` | `@aihu/signals@0.5.2` |
| 3 | `@aihu/dom` | `dom-v0.1.1` | `0.1.1` | `@aihu/signals@0.5.2`, `@aihu/reactive@0.2.2`, and `@aihu/arbor@4.1.3` |

The release workflow enforces the registry prerequisite for every dependent,
so Reactive and Arbor may be published in either order after Signals, while
DOM waits for both. The tag must point at the reviewed merged default-branch
commit and must match the package version in that commit.

Every release candidate also needs an isolated packed-artifact smoke test. It
must install tarballs into a fresh temporary directory, never a workspace, and
prove that a signal update renders through `@aihu/dom`. This catches a missing
or stale registry dependency before a consumer release reaches npm.
