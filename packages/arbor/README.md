### `branch(tag, attrs?, children?): Branch`

Constructs a branch node. `tag` is the element tag name, or `null` for a fragment (children mount directly into the parent).

```ts
branch('section', { id: 'main' }, [ leaf('hi') ])
branch(null, null, [ leaf('a'), leaf('b') ])  // fragment
```

### `leaf(value): Leaf` / `leaf.element(tag, attrs?): Leaf`

Two shapes share one symbol:

- `leaf(value)` — text leaf. `value` is `string` (static) or a `Signal<string>` tuple (reactive).
- `leaf.element(tag, attrs?)` — terminal element leaf for `<img>`, `<br>`, `<input>`, `<hr>`, etc.

```ts
leaf('hi')                     // static text
leaf([greeting, setGreeting])  // reactive text
leaf.element('img', { src: '/logo.png' })
leaf.element('hr')
```
