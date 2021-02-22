import type { Cause } from '../Cause'
import type { Option } from '@principia/base/Option'

import { pipe } from '@principia/base/Function'
import { None, Some } from '@principia/base/Option'

import * as A from '../Array'
import * as I from '../IO'

export type Pull<R, E, O> = I.IO<R, Option<E>, ReadonlyArray<O>>

export const end = I.fail(None())

export function fail<E>(e: E): I.FIO<Option<E>, never> {
  return I.fail(Some(e))
}

export function halt<E>(e: Cause<E>): I.IO<unknown, Option<E>, never> {
  return pipe(I.halt(e), I.mapError(Some))
}

export function empty<A>(): I.UIO<ReadonlyArray<A>> {
  return I.pure(A.empty())
}

export function emit<A>(a: A): I.UIO<ReadonlyArray<A>> {
  return I.pure(A.pure(a))
}

export function emitChunk<A>(as: ReadonlyArray<A>): I.UIO<ReadonlyArray<A>> {
  return I.pure(as)
}
