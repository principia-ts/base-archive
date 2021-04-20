/* eslint-disable functional/immutable-data */
import type { Chunk, ChunkBuilder } from './core'

import { identity, pipe } from '@principia/prelude/function'

import * as I from '../IO/core'
import { builder, concrete, foldl_ } from './core'

/*
 * -------------------------------------------
 * io combinators
 * -------------------------------------------
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
      let i       = 0
      while (i < array.length) {
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
        i++
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
      let i       = 0
      while (i < array.length) {
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
        i++
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
      let i       = 0
      while (i < array.length) {
        const a = array[i]
        out     = I.crossWith_(out, p(a), (chunk, res) => {
          if (res) {
            return chunk.append(a)
          } else {
            return chunk
          }
        })
        i++
      }
    }
    return I.map_(out, (b) => b.result())
  })
}

export function filterM<A, R, E>(p: (a: A) => I.IO<R, E, boolean>): (as: Chunk<A>) => I.IO<R, E, Chunk<A>> {
  return (as) => filterM_(as, p)
}
