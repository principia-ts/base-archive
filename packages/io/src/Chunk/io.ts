import type { Chunk } from './core'

import { pipe } from '@principia/base/Function'

import * as I from '../IO'
import { append_, foldl_, isTyped } from './core'

export function dropWhileEffect_<A, R, E>(as: Chunk<A>, p: (a: A) => I.IO<R, E, boolean>): I.IO<R, E, Chunk<A>> {
  return I.effectSuspendTotal(() => {
    let dropping        = I.succeed(true) as I.IO<R, E, boolean>
    let ret: Chunk<any> = isTyped(as) ? Buffer.alloc(0) : ([] as A[])

    for (let i = 0; i < as.length; i++) {
      const a  = as[i]
      dropping = pipe(
        dropping,
        I.bind((d) => (d ? p(a) : I.succeed(false))),
        I.map((d) => {
          if (d) {
            return true
          } else {
            ret = append_(ret, a)
            return false
          }
        })
      )
    }
    return I.as_(dropping, () => ret)
  })
}

export function dropWhileEffect<A, R, E>(p: (a: A) => I.IO<R, E, boolean>): (as: Chunk<A>) => I.IO<R, E, Chunk<A>> {
  return (as) => dropWhileEffect_(as, p)
}

export function foldlEffect_<A, R, E, B>(as: Chunk<A>, b: B, f: (b: B, a: A) => I.IO<R, E, B>): I.IO<R, E, B> {
  return foldl_(as, I.succeed(b) as I.IO<R, E, B>, (b, a) => I.bind_(b, (_) => f(_, a)))
}

export function foldlEffect<A, R, E, B>(b: B, f: (b: B, a: A) => I.IO<R, E, B>): (as: Chunk<A>) => I.IO<R, E, B> {
  return (as) => foldlEffect_(as, b, f)
}
