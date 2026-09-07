# Aihu DOM

The independently versioned DOM update engine for Aihu.

| Package | Role | Dependencies |
| --- | --- | --- |
| `@aihu/dom` | default opt-in DOM entry point; exposes rendering plus focused subpaths | `@aihu/arbor`, `@aihu/reactive`, `@aihu/signals` |
| `@aihu/signals` | signals, effects, scopes, batching, lifecycle ownership | none |
| `@aihu/reactive` | proxy-backed reactive trees and helpers | `@aihu/signals` |
| `@aihu/arbor` | DOM materialization, hydration, and progressive rendering | peer: `@aihu/signals` |

`@aihu/dom` provides `@aihu/dom`, `@aihu/dom/hydrate`,
`@aihu/dom/progressive`, `@aihu/dom/signals`, and `@aihu/dom/reactive`.
Consumers can use the focused packages directly when they need a narrower
dependency boundary.

This repository deliberately excludes components, custom-element runtime,
compiler, CSS, routing, server, and application tooling.

## Development

```bash
bun install
bun run check
```
