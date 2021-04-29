import * as A from './Array/core'
import * as E from './Eq'
import { pipe } from './function'
import * as G from './Guard'
import * as S from './Show'

export function tuple<T extends ReadonlyArray<any>>(...t: T): readonly [...T] {
  return t
}

/*
 * -------------------------------------------
 * Eq
 * -------------------------------------------
 */

export function getEq<C extends ReadonlyArray<E.Eq<any>>>(...components: C): E.Eq<{ [K in keyof C]: E.TypeOf<C[K]> }> {
  return E.Eq((x, y) => components.every((E, i) => E.equals_(x[i], y[i])))
}

/*
 * -------------------------------------------
 * Guard
 * -------------------------------------------
 */

export function getStrictGuard<C extends ReadonlyArray<G.AnyGuard>>(
  ...components: C
): G.Guard<Readonly<{ [I in keyof C]: G.InputOf<C[I]> }>, Readonly<{ [I in keyof C]: G.TypeOf<C[I]> }>> {
  return G.Guard((u): u is Readonly<{ [I in keyof C]: G.TypeOf<C[I]> }> => {
    for (let i = 0; i < components.length; i++) {
      if (!components[i].is(u[i])) {
        return false
      }
    }
    return true
  })
}

export function getIndicesGuard<C extends ReadonlyArray<unknown>>(
  ...components: C
): G.Guard<ReadonlyArray<unknown>, { [I in keyof C]: unknown }> {
  return G.Guard((u): u is { [K in keyof C]: unknown } => u.length === components.length)
}

export function getGuard<C extends ReadonlyArray<G.AnyUGuard>>(
  ...components: C
): G.Guard<unknown, Readonly<{ [I in keyof C]: G.TypeOf<C[I]> }>>
export function getGuard(...components: ReadonlyArray<G.AnyUGuard>): G.Guard<unknown, ReadonlyArray<any>> {
  return pipe(A.GuardUnknownArray, G.compose(getIndicesGuard(...components)), G.compose(getStrictGuard(...components)))
}

/*
 * -------------------------------------------
 * Guard
 * -------------------------------------------
 */

export function getShow<C extends ReadonlyArray<S.Show<any>>>(
  ...components: C
): S.Show<{ [K in keyof C]: S.TypeOf<C[K]> }> {
  return S.Show(
    (t) =>
      `[${pipe(
        components,
        A.imap((i, S) => S.show(t[i])),
        A.join(', ')
      )}]`
  )
}
