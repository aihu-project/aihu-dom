# @aihu/dom

The default, opt-in DOM entry point for Aihu.

```ts
import { branch, leaf, mount } from '@aihu/dom'
import { signal } from '@aihu/dom/signals'
```

Use the focused packages directly when that gives an application a smaller or
clearer dependency boundary:

- `@aihu/signals` observes state.
- `@aihu/reactive` models deep reactive state.
- `@aihu/arbor` renders DOM.

Hydration and progressive rendering remain explicit subpaths:

```ts
import { hydrate } from '@aihu/dom/hydrate'
import { progressive } from '@aihu/dom/progressive'
```
