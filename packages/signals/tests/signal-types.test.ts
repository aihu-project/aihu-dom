import { describe, expect, it } from 'vitest'
import { signal } from '../src/signal.ts'

/**
 * Type-level regression for `signal(null)` / `signal([])` inferring an
 * unusable `T` ("signal(null) infers T = null" — see aihu-dom#5).
 *
 * These assertions are enforced by `tsc --noEmit` (`tests/**\/*.ts` is part
 * of this package's tsconfig `include`): a broken overload either makes a
 * "must type-check" line fail to compile, or makes a `@ts-expect-error`
 * line stop erroring (itself a tsc error — "Unused '@ts-expect-error'
 * directive").
 */

interface Doc {
  title: string
}

describe('signal() type inference', () => {
  it('signal(null) allows setting a concrete value without an annotation', () => {
    const [doc, setDoc] = signal(null)
    expect(doc()).toBeNull()
    const realDoc: Doc = { title: 'hello' }
    setDoc(realDoc) // must type-check: T defaults to `unknown`, not `null`
    expect(doc()).toEqual(realDoc)

    // @ts-expect-error `unknown` still can't be dot-accessed without
    // narrowing — the default widens to `unknown`, not silently to `any`.
    doc().title
  })

  it('signal(null) still narrows correctly with an explicit annotation', () => {
    const [doc, setDoc] = signal<Doc | null>(null)
    setDoc({ title: 'x' })
    const current = doc()
    if (current !== null) {
      expect(current.title).toBe('x')
    }
  })

  it('signal([]) allows setting a concrete array without an annotation', () => {
    const [list, setList] = signal([])
    expect(list()).toEqual([])
    setList([1, 2, 3]) // must type-check: T defaults to `unknown[]`, not `never[]`
    expect(list()).toEqual([1, 2, 3])
    setList(['a', 'b'])
    expect(list()).toEqual(['a', 'b'])
  })

  it('signal<T[]>([]) still narrows to a concrete element type when annotated', () => {
    const [list, setList] = signal<number[]>([])
    setList([1, 2, 3])
    expect(list()).toEqual([1, 2, 3])
    // @ts-expect-error the element type is still enforced once annotated
    setList(['a'])
  })

  it('normal inference is unaffected by the new overloads', () => {
    const [count, setCount] = signal(0)
    setCount(1)
    expect(count()).toBe(1)
    // @ts-expect-error non-empty initial values still infer their own type
    setCount('nope')
  })
})
