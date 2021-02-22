/**
 * Re-exports @principia/base/Array and adds IO-specific combinators
 */

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/Function'

import * as I from './IO'

export function dropWhileM_<A, R, E>(
  as: ReadonlyArray<A>,
  p: (a: A) => I.IO<R, E, boolean>
): I.IO<R, E, ReadonlyArray<A>> {
  return I.deferTotal(() => {
    let dropping        = I.succeed(true) as I.IO<R, E, boolean>
    const ret: Array<A> = []

    for (let i = 0; i < as.length; i++) {
      const a  = as[i]
      dropping = pipe(
        dropping,
        I.bind((d) => (d ? p(a) : I.succeed(false))),
        I.map((d) => {
          if (d) {
            return true
          } else {
            ret.push(a)
            return false
          }
        })
      )
    }
    return I.as_(dropping, () => ret)
  })
}

export function dropWhileM<A, R, E>(
  p: (a: A) => I.IO<R, E, boolean>
): (as: ReadonlyArray<A>) => I.IO<R, E, ReadonlyArray<A>> {
  return (as) => dropWhileM_(as, p)
}

export function takeWhileM_<R, E, A>(
  as: ReadonlyArray<A>,
  p: (a: A) => I.IO<R, E, boolean>
): I.IO<R, E, ReadonlyArray<A>> {
  return I.deferTotal(() => {
    let taking          = I.succeed(true) as I.IO<R, E, boolean>
    const ret: Array<A> = []

    for (let i = 0; i < as.length; i++) {
      const a = as[i]
      taking  = pipe(
        taking,
        I.bind((t) => (t ? p(a) : I.succeed(false))),
        I.map((t) => {
          if (t) {
            ret.push(a)
            return true
          } else {
            return false
          }
        })
      )
    }
    return I.as_(taking, () => ret)
  })
}

export function takeWhileM<A, R, E>(
  p: (a: A) => I.IO<R, E, boolean>
): (as: ReadonlyArray<A>) => I.IO<R, E, ReadonlyArray<A>> {
  return (as) => takeWhileM_(as, p)
}

export function foldlM_<A, R, E, B>(as: ReadonlyArray<A>, b: B, f: (b: B, a: A) => I.IO<R, E, B>): I.IO<R, E, B> {
  return A.foldl_(as, I.succeed(b) as I.IO<R, E, B>, (b, a) => I.bind_(b, (_) => f(_, a)))
}

export function foldlM<A, R, E, B>(b: B, f: (b: B, a: A) => I.IO<R, E, B>): (as: ReadonlyArray<A>) => I.IO<R, E, B> {
  return (as) => foldlM_(as, b, f)
}

export * from '@principia/base/Array'
