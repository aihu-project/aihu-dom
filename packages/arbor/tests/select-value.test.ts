import { signal } from '@aihu/signals'
import { describe, expect, it } from 'vitest'
import { branch, each, leaf, mount, when } from '../src/index.ts'

/**
 * aihu-dom#8 — a `<select value={sig}>` binding must show the option matching
 * `sig()` after any mount or reconcile, not only when `sig` changes.
 *
 * `select.value = x` selects only an option that already exists. Attrs are
 * applied before children, and a reconcile can remove the selected `<option>`
 * (FEL-395 re-grows rows whose item object changed even when the key didn't),
 * while re-writing the same value is dropped by the signal's equality check.
 */

type Row = { key: string; label: string }
const load = (): Row[] => [
  { key: 'a', label: 'A' },
  { key: 'b', label: 'B' },
  { key: 'c', label: 'C' },
]

const option = (value: string, label: string) => branch('option', { value }, [leaf(label)])

function selectOf(host: HTMLElement): HTMLSelectElement {
  return host.querySelector('select') as HTMLSelectElement
}

describe('<select value={signal}>', () => {
  it('selects the bound option when options are static children', () => {
    const host = document.createElement('div')
    const key = signal('b')
    const scope = mount(
      branch('select', { value: key }, [
        option('', 'Choose'),
        option('a', 'A'),
        option('b', 'B'),
        option('c', 'C'),
      ]),
      host,
    )
    expect(selectOf(host).value).toBe('b')
    scope.dispose()
  })

  it('selects the bound option when each() options are non-empty at mount', () => {
    const host = document.createElement('div')
    const rows = signal(load())
    const key = signal('b')
    const scope = mount(
      branch('select', { value: key }, [
        option('', 'Choose'),
        each(
          rows,
          (r) => r.key,
          (r) => option(r.key, r.label),
        ),
      ]),
      host,
    )
    expect(selectOf(host).value).toBe('b')
    scope.dispose()
  })

  it('selects the bound option when the key is set before its rows arrive', () => {
    const host = document.createElement('div')
    const [getRows, setRows] = signal<Row[]>([])
    const key = signal('b')
    const scope = mount(
      branch('select', { value: key }, [
        option('', 'Choose'),
        each(
          [getRows, setRows],
          (r) => r.key,
          (r) => option(r.key, r.label),
        ),
      ]),
      host,
    )
    expect(selectOf(host).value).toBe('')
    setRows(load())
    expect(selectOf(host).value).toBe('b')
    scope.dispose()
  })

  it('keeps the selection when rows are replaced by new objects with the same keys', () => {
    const host = document.createElement('div')
    const [getRows, setRows] = signal<Row[]>([])
    const [getKey, setKey] = signal('')
    const scope = mount(
      branch('select', { value: [getKey, setKey] }, [
        option('', 'Choose'),
        each(
          [getRows, setRows],
          (r) => r.key,
          (r) => option(r.key, r.label),
        ),
      ]),
      host,
    )
    setRows(load())
    setKey('b')
    expect(selectOf(host).value).toBe('b')
    // A store emitting a fresh snapshot: same keys, new objects, same value.
    setRows(load())
    setKey('b')
    expect(getKey()).toBe('b')
    expect(selectOf(host).value).toBe('b')
    scope.dispose()
  })

  it('does not undo a choice the user made through the change handler', () => {
    const host = document.createElement('div')
    const [getRows, setRows] = signal<Row[]>(load())
    const [getKey, setKey] = signal('b')
    const scope = mount(
      branch(
        'select',
        {
          value: [getKey, setKey],
          onchange: (e: Event) => setKey((e.target as HTMLSelectElement).value),
        },
        [
          option('', 'Choose'),
          each(
            [getRows, setRows],
            (r) => r.key,
            (r) => option(r.key, r.label),
          ),
        ],
      ),
      host,
    )
    const sel = selectOf(host)
    sel.value = 'c'
    sel.dispatchEvent(new Event('change'))
    expect(getKey()).toBe('c')
    setRows(load())
    expect(sel.value).toBe('c')
    scope.dispose()
  })

  it('re-selects after when() grows or removes options', () => {
    const host = document.createElement('div')
    const [getShow, setShow] = signal(false)
    const key = signal('b')
    const scope = mount(
      branch('select', { value: key }, [
        option('', 'Choose'),
        when([getShow, setShow], () =>
          branch(null, undefined, [option('a', 'A'), option('b', 'B')]),
        ),
      ]),
      host,
    )
    expect(selectOf(host).value).toBe('')
    setShow(true)
    expect(selectOf(host).value).toBe('b')
    setShow(false)
    expect(selectOf(host).value).toBe('')
    scope.dispose()
  })

  it('leaves <select multiple> bindings unchanged', () => {
    const host = document.createElement('div')
    const key = signal('b')
    const scope = mount(
      branch('select', { multiple: true, value: key }, [option('a', 'A'), option('b', 'B')]),
      host,
    )
    expect(() => selectOf(host).value).not.toThrow()
    scope.dispose()
  })
})
