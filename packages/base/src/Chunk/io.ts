/* eslint-disable functional/immutable-data */
import type { Chunk, ChunkBuilder } from './core'

import { identity, pipe } from '../function'
import * as I from '../IO/core'
import * as O from '../Option'
import { builder, concrete, foldl_ } from './core'

/*
 * -------------------------------------------------------------------------------------------------
 * io combinators
 * -------------------------------------------------------------------------------------------------
 */

export function mapM_<A, R, E, B>(as: Chunk<A>, f: (a: A) => I.IO<R, E, B>): I.IO<R, E, Chunk<B>> {
  return I.deferTotal(() => {
    const out = builder<B>()
    return pipe(
      as,
      I.foreachUnit((a) =>
        I.map_(f(a), (b) => {
          out.append(b)
        })
      ),
      I.as(() => out.result())
    )
  })
}

export function mapM<A, R, E, B>(f: (a: A) => I.IO<R, E, B>): (as: Chunk<A>) => I.IO<R, E, Chunk<B>> {
  return (as) => mapM_(as, f)
}

export function collectAllM<R, E, A>(as: Chunk<I.IO<R, E, A>>): I.IO<R, E, Chunk<A>> {
  return mapM_(as, identity)
}

function findMLoop_<R, E, A>(
  iterator: Iterator<ArrayLike<A>>,
  f: (a: A) => I.IO<R, E, boolean>,
  array: ArrayLike<A>,
  i: number,
  length: number
): I.IO<R, E, O.Option<A>> {
  if (i < length) {
    const a = array[i]
    return f(a)['>>=']((b) => (b ? I.succeed(O.some(a)) : findMLoop_(iterator, f, array, i + 1, length)))
  }
  let result
  if (!(result = iterator.next()).done) {
    const arr = result.value
    const len = arr.length
    return findMLoop_(iterator, f, arr, 0, len)
  }
  return I.succeed(O.none())
}

export function findM_<R, E, A>(as: Chunk<A>, f: (a: A) => I.IO<R, E, boolean>): I.IO<R, E, O.Option<A>> {
  concrete(as)
  const iterator = as.arrayIterator()
  let result
  if (!(result = iterator.next()).done) {
    const array  = result.value
    const length = array.length
    return findMLoop_(iterator, f, array, 0, length)
  } else {
    return I.succeed(O.none())
  }
}

export function findM<R, E, A>(f: (a: A) => I.IO<R, E, boolean>): (as: Chunk<A>) => I.IO<R, E, O.Option<A>> {
  return (as) => findM_(as, f)
}

export function foldlM_<A, R, E, B>(as: Chunk<A>, b: B, f: (b: B, a: A) => I.IO<R, E, B>): I.IO<R, E, B> {
  return foldl_(as, I.succeed(b) as I.IO<R, E, B>, (acc, a) => I.bind_(acc, (b) => f(b, a)))
}

export function foldlM<A, R, E, B>(b: B, f: (b: B, a: A) => I.IO<R, E, B>): (as: Chunk<A>) => I.IO<R, E, B> {
  return (as) => foldlM_(as, b, f)
}

export function takeWhileM_<A, R, E>(as: Chunk<A>, p: (a: A) => I.IO<R, E, boolean>): I.IO<R, E, Chunk<A>> {
  return I.deferTotal(() => {
    concrete(as)
    let taking: I.IO<R, E, boolean> = I.succeed(true)
    const out                       = builder<A>()
    const iterator                  = as.arrayIterator()
    let result: IteratorResult<ArrayLike<A>>
    while (!(result = iterator.next()).done) {
      const array = result.value
      for (let i = 0; i < array.length; i++) {
        const j = i
        taking  = I.bind_(taking, (b) => {
          const a = array[j]
          return I.map_(b ? p(a) : I.succeed(false), (b1) => {
            if (b1) {
              out.append(a)
              return true
            } else {
              return false
            }
          })
        })
      }
    }
    return I.as_(taking, () => out.result())
  })
}

export function takeWhileM<A, R, E>(p: (a: A) => I.IO<R, E, boolean>): (as: Chunk<A>) => I.IO<R, E, Chunk<A>> {
  return (as) => takeWhileM_(as, p)
}

export function dropWhileM_<A, R, E>(as: Chunk<A>, p: (a: A) => I.IO<R, E, boolean>): I.IO<R, E, Chunk<A>> {
  return I.deferTotal(() => {
    concrete(as)
    let dropping: I.IO<R, E, boolean> = I.succeed(true)
    const out                         = builder<A>()
    const iterator                    = as.arrayIterator()
    let result: IteratorResult<ArrayLike<A>>
    while (!(result = iterator.next()).done) {
      const array = result.value
      for (let i = 0; i < array.length; i++) {
        const j  = i
        dropping = I.bind_(dropping, (d) => {
          const a = array[j]
          return I.map_(d ? p(a) : I.succeed(false), (b) => {
            if (b) {
              return true
            } else {
              out.append(a)
              return false
            }
          })
        })
      }
    }
    return I.as_(dropping, () => out.result())
  })
}

export function dropWhileM<A, R, E>(p: (a: A) => I.IO<R, E, boolean>): (as: Chunk<A>) => I.IO<R, E, Chunk<A>> {
  return (as) => dropWhileM_(as, p)
}

export function filterM_<A, R, E>(as: Chunk<A>, p: (a: A) => I.IO<R, E, boolean>): I.IO<R, E, Chunk<A>> {
  return I.deferTotal(() => {
    concrete(as)
    const c                              = builder<A>()
    let out: I.IO<R, E, ChunkBuilder<A>> = I.succeed(c)
    const iterator                       = as.arrayIterator()
    let result: IteratorResult<ArrayLike<A>>
    while (!(result = iterator.next()).done) {
      const array = result.value
      for (let i = 0; i < array.length; i++) {
        const a = array[i]
        out     = I.crossWith_(out, p(a), (chunk, res) => {
          if (res) {
            return chunk.append(a)
          } else {
            return chunk
          }
        })
      }
    }
    return I.map_(out, (b) => b.result())
  })
}

export function filterM<A, R, E>(p: (a: A) => I.IO<R, E, boolean>): (as: Chunk<A>) => I.IO<R, E, Chunk<A>> {
  return (as) => filterM_(as, p)
}
