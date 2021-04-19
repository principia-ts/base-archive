import type { Cause } from '../Cause'
import type { Chunk } from '../Chunk'
import type { Option } from '@principia/base/Option'

import { pipe } from '@principia/base/function'
import { None, Some } from '@principia/base/Option'

import * as C from '../Chunk'
import * as I from '../IO'

export type Pull<R, E, O> = I.IO<R, Option<E>, Chunk<O>>

export const end = I.fail(None())

export function fail<E>(e: E): I.FIO<Option<E>, never> {
  return I.fail(Some(e))
}

export function halt<E>(e: Cause<E>): I.IO<unknown, Option<E>, never> {
  return pipe(I.halt(e), I.mapError(Some))
}

export function empty<A>(): I.UIO<Chunk<A>> {
  return I.pure(C.empty())
}

export function emit<A>(a: A): I.UIO<Chunk<A>> {
  return I.pure(C.single(a))
}

export function emitChunk<A>(as: Chunk<A>): I.UIO<Chunk<A>> {
  return I.pure(as)
}
