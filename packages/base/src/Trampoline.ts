import type { Lazy, MorphismN } from './function'

export interface Done<A> {
  readonly _tag: 'Done'
  readonly value: A
}

export interface More<A> {
  readonly _tag: 'More'
  readonly fn: () => Trampoline<A>
}

export type Trampoline<A> = More<A> | Done<A>

export function done<A>(a: A): Done<A> {
  return {
    _tag: 'Done',
    value: a
  }
}

export function more<A>(f: Lazy<Trampoline<A>>): More<A> {
  return {
    _tag: 'More',
    fn: f
  }
}

export function map_<A, B>(fa: Trampoline<A>, f: (a: A) => B): Trampoline<B> {
  switch (fa._tag) {
    case 'More':
      return more(() => map_(fa.fn(), f))
    case 'Done':
      return done(f(fa.value))
  }
}

export function bind_<A, B>(fa: Trampoline<A>, f: (a: A) => Trampoline<B>): Trampoline<B> {
  switch (fa._tag) {
    case 'More':
      return more(() => bind_(fa, f))
    case 'Done':
      return f(fa.value)
  }
}

export function cross_<A, B>(ta: Trampoline<A>, tb: Trampoline<B>): Trampoline<readonly [A, B]> {
  return bind_(ta, (a) => map_(tb, (b) => [a, b]))
}

export function trampoline<A extends ReadonlyArray<unknown>, B>(fn: MorphismN<A, Trampoline<B>>): (...args: A) => B {
  return (...args) => {
    let result = fn(...args)
    /* eslint-disable-next-line */
    while (true) {
      switch (result._tag) {
        case 'More':
          result = result.fn()
          break
        case 'Done':
          return result.value
      }
    }
  }
}
