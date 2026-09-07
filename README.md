# Aihu DOM

The independently versioned DOM update engine for Aihu.

| Package | Role | Dependencies |
| --- | --- | --- |
| `@aihu/signals` | signals, effects, scopes, batching, lifecycle ownership | none |
| `@aihu/reactive` | proxy-backed reactive trees and helpers | `@aihu/signals` |
| `@aihu/arbor` | DOM materialization, hydration, and progressive rendering | peer: `@aihu/signals` |

This repository deliberately excludes components, custom-element runtime, compiler, CSS, routing, server, and application tooling. Consumers opt into each package independently.

## Development

```bash
bun install
bun run check
```
