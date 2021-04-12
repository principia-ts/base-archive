import type { Lazy } from '@principia/base/function'
import type * as HKT from '@principia/base/HKT'
import type { USync } from '@principia/base/Sync'
import type * as P from '@principia/base/typeclass'
import type { UnionToIntersection } from '@principia/base/util/types'

import * as A from '@principia/base/Array'
import { flow, memoize, pipe } from '@principia/base/function'
import * as HS from '@principia/base/HashSet'
import * as Set from '@principia/base/Set'
import * as S from '@principia/base/Sync'

import { EncoderURI } from './Modules'
import { _intersect } from './util'

export interface Encoder<A, O> {
  readonly encode: (a: A) => USync<O>
}

export type InputOf<E> = E extends Encoder<infer A, any> ? A : never
export type OutputOf<E> = E extends Encoder<any, infer O> ? O : never

export type AnyE = Encoder<any, any>

export type V = HKT.V<'I', '-'>

/*
 * -------------------------------------------
 * constructors
 * -------------------------------------------
 */

export function fromEncode<A, O>(encode: (a: A) => USync<O>): Encoder<A, O> {
  return { encode }
}

/*
 * -------------------------------------------
 * Category
 * -------------------------------------------
 */

export interface IdEncoder<A> extends Encoder<A, A> {
  readonly _tag: 'IdE'
}

export function id<A>(): IdEncoder<A> {
  return {
    _tag: 'IdE',
    encode: S.pure
  }
}

export interface ComposeEncoder<From extends AnyE, To extends Encoder<OutputOf<From>, P>, P>
  extends Encoder<InputOf<From>, P> {
  readonly _tag: 'ComposeE'
  readonly from: From
  readonly to: To
}

export function compose_<From extends AnyE, To extends Encoder<OutputOf<From>, P>, P>(
  from: From,
  to: To
): ComposeEncoder<From, To, P> {
  return {
    _tag: 'ComposeE',
    from,
    to,
    encode: flow(from.encode, S.bind(to.encode))
  }
}

export function compose<From extends AnyE, To extends Encoder<OutputOf<From>, P>, P>(
  to: To
): (from: From) => ComposeEncoder<From, To, P> {
  return (from) => compose_(from, to)
}

/*
 * -------------------------------------------
 * Contravariant
 * -------------------------------------------
 */

export interface ContramapEncoder<From extends AnyE, B> extends Encoder<B, OutputOf<From>> {
  readonly _tag: 'ContramapE'
  readonly from: From
  readonly f: (b: B) => InputOf<From>
}

export function contramap_<From extends AnyE, B>(fa: From, f: (b: B) => InputOf<From>): ContramapEncoder<From, B> {
  return {
    _tag: 'ContramapE',
    from: fa,
    f,
    encode: flow(f, fa.encode)
  }
}

export function contramap<From extends AnyE, B>(f: (b: B) => InputOf<From>): (fa: From) => ContramapEncoder<From, B> {
  return (fa) => contramap_(fa, f)
}

/*
 * -------------------------------------------
 * combinators
 * -------------------------------------------
 */

export interface NullableEncoder<Or extends AnyE> extends Encoder<null | undefined | InputOf<Or>, null | OutputOf<Or>> {
  readonly _tag: 'NullableEncoder'
  readonly or: Or
}

export function nullable<Or extends AnyE>(or: Or): NullableEncoder<Or> {
  return {
    _tag: 'NullableEncoder',
    or,
    encode: (a) => (a == null ? S.succeed(null) : or.encode(a))
  }
}

export interface StructEncoder<P extends Record<string, AnyE>>
  extends Encoder<{ [K in keyof P]: InputOf<P[K]> }, { [K in keyof P]: OutputOf<P[K]> }> {
  readonly _tag: 'StructEncoder'
  readonly properties: P
}

export function struct<P extends Record<string, AnyE>>(properties: P): StructEncoder<P> {
  return {
    _tag: 'StructEncoder',
    properties,
    encode: (a) =>
      S.deferTotal(() => {
        let computation = S.succeed({} as Record<keyof P, any>)
        for (const k in properties) {
          computation = pipe(
            computation,
            S.crossWith(properties[k].encode(a[k]), (mut_o, a) => {
              mut_o[k] = a
              return mut_o
            })
          )
        }
        return computation
      })
  }
}

export interface PartialEncoder<P extends Record<string, AnyE>>
  extends Encoder<
    Partial<
      {
        [K in keyof P]: InputOf<P[K]>
      }
    >,
    Partial<
      {
        [K in keyof P]: OutputOf<P[K]>
      }
    >
  > {
  readonly _tag: 'PartialEncoder'
  readonly properties: P
}

export function partial<P extends Record<string, AnyE>>(properties: P): PartialEncoder<P> {
  return {
    _tag: 'PartialEncoder',
    properties,
    encode: (a) =>
      S.deferTotal(() => {
        let computation = S.succeed({} as Partial<Record<keyof P, any>>)
        for (const k in properties) {
          const v = a[k]
          if (v === undefined) {
            computation = pipe(
              computation,
              S.map((mut_o) => {
                mut_o[k] = undefined
                return mut_o
              })
            )
          } else {
            computation = pipe(
              computation,
              S.crossWith(properties[k].encode(v), (mut_o, a) => {
                mut_o[k] = a
                return mut_o
              })
            )
          }
        }
        return computation
      })
  }
}

export interface RecordEncoder<E extends AnyE>
  extends Encoder<Record<string, InputOf<E>>, Record<string, OutputOf<E>>> {
  readonly _tag: 'RecordEncoder'
  readonly codomain: E
}

export function record<C extends AnyE>(codomain: C): RecordEncoder<C> {
  return {
    _tag: 'RecordEncoder',
    codomain,
    encode: (a) => {
      let computation = S.succeed({} as Record<string, OutputOf<C>>)
      for (const k in a) {
        computation = pipe(
          computation,
          S.crossWith(codomain.encode(a[k]), (mut_o, a) => {
            mut_o[k] = a
            return mut_o
          })
        )
      }
      return computation
    }
  }
}

export interface ArrayEncoder<Item extends AnyE>
  extends Encoder<ReadonlyArray<InputOf<Item>>, ReadonlyArray<OutputOf<Item>>> {
  readonly _tag: 'ArrayEncoder'
  readonly item: Item
}

export function array<Item extends AnyE>(item: Item): ArrayEncoder<Item> {
  return {
    _tag: 'ArrayEncoder',
    item,
    encode: S.foreach(item.encode)
  }
}

export interface TupleEncoder<C extends readonly [AnyE, ...ReadonlyArray<AnyE>]>
  extends Encoder<{ [K in keyof C]: InputOf<C[K]> }, { [K in keyof C]: OutputOf<C[K]> }> {
  readonly _tag: 'TupleEncoder'
  readonly components: C
}

export function tuple<C extends readonly [AnyE, ...ReadonlyArray<AnyE>]>(...components: C): TupleEncoder<C> {
  return {
    _tag: 'TupleEncoder',
    components,
    encode: (as) => S.iforeach_(components, (i, c) => c.encode(as[i])) as any
  }
}

export interface IntersectEncoder<Members extends readonly [AnyE, ...ReadonlyArray<AnyE>]>
  extends Encoder<
    UnionToIntersection<{ [K in keyof Members]: InputOf<Members[K]> }[number]>,
    UnionToIntersection<{ [K in keyof Members]: OutputOf<Members[K]> }[number]>
  > {
  readonly _tag: 'IntersectEncoder'
  readonly members: Members
}

export function intersect<Members extends readonly [AnyE, ...ReadonlyArray<AnyE>]>(
  ...members: Members
): IntersectEncoder<Members> {
  return {
    _tag: 'IntersectEncoder',
    members,
    encode: (a) =>
      S.deferTotal(() => {
        return pipe(
          members.slice(1),
          A.foldl(members[0].encode(a), (computation, encoder) =>
            pipe(computation, S.crossWith(encoder.encode(a), _intersect))
          )
        )
      })
  }
}

type EnsureTag<T extends string, Members extends Record<string, AnyE>> = Members &
  {
    [K in keyof Members]: Encoder<any, { [tag in T]: K }>
  }

export interface SumEncoder<T extends string, Members extends Record<string, AnyE>>
  extends Encoder<InputOf<Members[keyof Members]>, OutputOf<Members[keyof Members]>> {
  readonly _tag: 'SumEncoder'
  readonly tag: T
  readonly members: Members
}

export function sum<T extends string>(
  tag: T
): <Members extends Record<string, AnyE>>(members: EnsureTag<T, Members>) => SumEncoder<T, Members> {
  return (members) => ({
    _tag: 'SumEncoder',
    tag,
    members,
    encode: (a) => members[a[tag]].encode(a)
  })
}

export interface LazyEncoder<E extends AnyE> extends Encoder<InputOf<E>, OutputOf<E>> {
  readonly _tag: 'LazyEncoder'
  readonly encoder: Lazy<E>
}

export function lazy<E extends AnyE>(encoder: () => E): LazyEncoder<E> {
  const get = memoize<void, E>(encoder)
  return {
    _tag: 'LazyEncoder',
    encoder,
    encode: (a) => get().encode(a)
  }
}

/*
 * -------------------------------------------
 * datatypes
 * -------------------------------------------
 */

export const None = struct({
  _tag: id<'None'>()
})

export function Some<E extends AnyE>(value: E) {
  return struct({
    _tag: id<'Some'>(),
    value
  })
}

export function Option<E extends AnyE>(value: E) {
  return sum('_tag')({
    None,
    Some: Some(value)
  })
}

export function Left<E extends AnyE>(left: E) {
  return struct({
    _tag: id<'Left'>(),
    left
  })
}

export function Right<E extends AnyE>(right: E) {
  return struct({
    _tag: id<'Right'>(),
    right
  })
}

export function Either<E extends AnyE, A extends AnyE>(left: E, right: A) {
  return sum('_tag')({
    Left: Left(left),
    Right: Right(right)
  })
}

export function SetToArray<E extends AnyE>(
  item: E,
  O: P.Ord<InputOf<E>>
): Encoder<ReadonlySet<InputOf<E>>, ReadonlyArray<OutputOf<E>>> {
  const toArrayO = Set.toArray(O)
  return fromEncode((a: ReadonlySet<InputOf<E>>) => pipe(toArrayO(a), S.foreach(item.encode)))
}

export function HashSetToArray<E extends AnyE>(item: E, O: P.Ord<InputOf<E>>) {
  const toArrayO = HS.toArray(O)
  return fromEncode((a: HS.HashSet<InputOf<E>>) => pipe(toArrayO(a), S.foreach(item.encode)))
}

export { EncoderURI }
