import type { NonEmptyArray } from '../../NonEmptyArray'
import type { UnionToIntersection } from '../../util/types'
import type { IO } from '../core'

import { identity } from '../../function'
import { foreach_ } from '../core'
import { foreachPar_ } from './foreachPar'
import { foreachParN_ } from './foreachParN'

export type TupleR<T extends NonEmptyArray<IO<any, any, any>>> = UnionToIntersection<
  {
    [K in keyof T]: [T[K]] extends [IO<infer R, any, any>] ? (unknown extends R ? never : R) : never
  }[number]
>

export type TupleE<T extends NonEmptyArray<IO<any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [IO<any, infer E, any>] ? E : never
}[number]

export type TupleA<T extends NonEmptyArray<IO<any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [IO<any, any, infer A>] ? A : never
}

export function sequenceT<A extends NonEmptyArray<IO<any, any, any>>>(...t: A): IO<TupleR<A>, TupleE<A>, TupleA<A>> {
  return foreach_(t, identity) as any
}

export function sequenceTPar<A extends NonEmptyArray<IO<any, any, any>>>(...t: A): IO<TupleR<A>, TupleE<A>, TupleA<A>> {
  return foreachPar_(t, identity) as any
}

export function sequenceTParN(n: number) {
  return <A extends NonEmptyArray<IO<any, any, any>>>(...t: A): IO<TupleR<A>, TupleE<A>, TupleA<A>> =>
    foreachParN_(t, n, identity) as any
}
