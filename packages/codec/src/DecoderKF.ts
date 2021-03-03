import type { DecodeErrors, ErrorInfo } from './DecodeErrors'
import type { DecoderK } from './DecoderK'
import type { DecoderKFURI } from './Modules'
import type * as MD from './MonadDecoder'
import type { Predicate, Refinement } from '@principia/base/Function'
import type * as G from '@principia/base/Guard'
import type { Integer } from '@principia/base/Integer'
import type * as O from '@principia/base/Option'
import type { ReadonlyRecord } from '@principia/base/Record'
import type * as P from '@principia/base/typeclass'
import type { Primitive, UnionToIntersection } from '@principia/base/util/types'

import * as A from '@principia/base/Array'
import * as B from '@principia/base/Boolean'
import { pipe } from '@principia/base/Function'
import * as HKT from '@principia/base/HKT'
import * as I from '@principia/base/Integer'
import * as N from '@principia/base/Number'
import * as R from '@principia/base/Record'
import * as S from '@principia/base/String'
import * as FS from '@principia/free/FreeSemigroup'

import * as DE from './DecodeError'
import { error } from './DecodeErrors'
import * as K from './DecoderK'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export type V = HKT.V<'I', '_'>

interface DecoderMetadata {
  readonly name: string
}

export interface DecodeFn<I, O> {
  <M extends HKT.URIS, C = HKT.Auto>(M: MD.MonadDecoder<M, C, DecodeErrors>): (
    i: I
  ) => HKT.Kind<
    M,
    MD.V<C, DecodeErrors>,
    HKT.Initial<MD.V<C, DecodeErrors>, 'N'>,
    HKT.Initial<MD.V<C, DecodeErrors>, 'K'>,
    HKT.Initial<MD.V<C, DecodeErrors>, 'Q'>,
    HKT.Initial<MD.V<C, DecodeErrors>, 'W'>,
    HKT.Initial<MD.V<C, DecodeErrors>, 'X'>,
    HKT.Initial<MD.V<C, DecodeErrors>, 'I'>,
    HKT.Initial<MD.V<C, DecodeErrors>, 'S'>,
    HKT.Initial<MD.V<C, DecodeErrors>, 'R'>,
    DecodeErrors,
    O
  >
}

export interface DecodeFnHKT<I, O> {
  (M: MD.MonadDecoder<HKT.UHKT2<any>, HKT.Auto, DecodeErrors>): (i: I) => HKT.HKT2<any, DecodeErrors, O>
}

export interface DecoderKF<I, O> extends DecoderK<I, DecodeErrors, O> {
  readonly _meta: DecoderMetadata
}

export interface DecoderKFHKT<I, O> extends K.DecoderKHKT<I, DecodeErrors, O> {
  readonly _meta: DecoderMetadata
}

export type InputOf<X> = K.InputOf<X>
export type TypeOf<X> = K.TypeOf<X>

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

function _makeDecoder<I, O>(decode: DecoderK<I, DecodeErrors, O>['decode'], _meta: DecoderMetadata): DecoderKF<I, O> {
  return {
    decode,
    _meta
  }
}

export function makeDecoder<I, O>(decode: DecodeFnHKT<I, O>, _meta: DecoderMetadata): DecoderKF<I, O> {
  return {
    decode: decode as any,
    _meta
  }
}

export function fromRefinement<I, A extends I>(
  refinement: Refinement<I, A>,
  expected: string,
  info?: ErrorInfo
): DecoderKF<I, A> {
  return {
    decode: K.fromRefinement(refinement, (i) => error(i, expected, info)).decode,
    _meta: { name: expected }
  }
}

export function fromGuard<I, A extends I>(guard: G.Guard<I, A>, expected: string, info?: ErrorInfo): DecoderKF<I, A> {
  return fromRefinement(guard.is, expected, info)
}

export function literal<A extends readonly [Primitive, ...Primitive[]]>(
  ...values: A
): (info?: ErrorInfo) => DecoderKF<unknown, A[number]> {
  const name = A.map_(values, (value) => JSON.stringify(value)).join(' | ')
  return (info) => ({
    decode: K.literal((u, _) => error(u, name, info))(...values).decode,
    _meta: { name }
  })
}

/*
 * -------------------------------------------
 * Primitives
 * -------------------------------------------
 */

export function string(info?: ErrorInfo): DecoderKF<unknown, string> {
  return fromGuard(S.Guard, 'string', info)
}

export function number(info?: ErrorInfo): DecoderKF<unknown, number> {
  return fromGuard(N.Guard, 'number', info)
}

export function integer(info?: ErrorInfo): DecoderKF<unknown, Integer> {
  return fromGuard(I.GuardSafe, 'integer', info)
}

export function boolean(info?: ErrorInfo): DecoderKF<unknown, boolean> {
  return fromGuard(B.Guard, 'boolean', info)
}

export function UnknownArray(info?: ErrorInfo): DecoderKF<unknown, ReadonlyArray<unknown>> {
  return fromGuard(A.GuardUnknownArray, 'Array<unknown>', info)
}

export function UnknownRecord(info?: ErrorInfo): DecoderKF<unknown, ReadonlyRecord<string, unknown>> {
  return fromGuard(R.GuardUnknownRecord, 'Record<string, unknown>', info)
}

/*
 * -------------------------------------------
 * Alt
 * -------------------------------------------
 */

export function alt_<I, O>(me: DecoderKF<I, O>, that: () => DecoderKF<I, O>): DecoderKF<I, O> {
  return {
    decode: K.alt_(me, that).decode,
    _meta: { name: `${me._meta.name} <!> ${that()._meta.name}` }
  }
}

export function alt<I, O>(that: () => DecoderKF<I, O>): (me: DecoderKF<I, O>) => DecoderKF<I, O> {
  return (me) => alt_(me, that)
}

/*
 * -------------------------------------------
 * Category
 * -------------------------------------------
 */

export function compose_<I, A, B>(from: DecoderKF<I, A>, to: DecoderKF<A, B>): DecoderKF<I, B> {
  return {
    decode: K.compose_(from, to).decode,
    _meta: { name: `(${from._meta.name} >>> ${to._meta.name})` }
  }
}

export function compose<A, B>(to: DecoderKF<A, B>): <I>(from: DecoderKF<I, A>) => DecoderKF<I, B> {
  return (from) => compose_(from, to)
}

export function id<A>(): DecoderKF<A, A> {
  return {
    decode: K.id().decode,
    _meta: { name: 'id' }
  }
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<I, A, B>(ia: DecoderKF<I, A>, f: (a: A) => B): DecoderKF<I, B> {
  return {
    decode: (M) => (i) => M.map_(ia.decode(M)(i), f),
    _meta: {
      name: ia._meta.name
    }
  }
}

export function map<A, B>(f: (a: A) => B): <I>(ia: DecoderKF<I, A>) => DecoderKF<I, B> {
  return (ia) => map_(ia, f)
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function mapLeftWithInput_<I, A>(
  decoder: DecoderKF<I, A>,
  f: (input: I, e: DecodeErrors) => DecodeErrors
): DecoderKF<I, A> {
  return {
    decode: K.mapLeftWithInput_(decoder, f).decode,
    _meta: {
      name: decoder._meta.name
    }
  }
}

export function mapLeftWithInput<I>(
  f: (input: I, e: DecodeErrors) => DecodeErrors
): <A>(decoder: DecoderKF<I, A>) => DecoderKF<I, A> {
  return (decoder) => mapLeftWithInput_(decoder, f)
}

export function withMessage<I>(
  message: (input: I, e: DecodeErrors) => string
): <A>(decoder: DecoderKF<I, A>) => DecoderKF<I, A> {
  return mapLeftWithInput((input, e) => FS.element(DE.wrap({ message: message(input, e) }, e)))
}

export function wrapInfo<I, A>(info: ErrorInfo | undefined): (decoder: DecoderKF<I, A>) => DecoderKF<I, A> {
  return (decoder) => (info ? mapLeftWithInput_(decoder, (_, e) => FS.element(DE.wrap(info, e))) : decoder)
}

export function refine_<I, A, B extends A>(
  from: DecoderKF<I, A>,
  refinement: Refinement<A, B>,
  name: string,
  info?: ErrorInfo
): DecoderKF<I, B>
export function refine_<I, A>(
  from: DecoderKF<I, A>,
  predicate: Predicate<A>,
  name: string,
  info?: ErrorInfo
): DecoderKF<I, A>
export function refine_<I, A>(
  from: DecoderKF<I, A>,
  predicate: Predicate<A>,
  name: string,
  info?: ErrorInfo
): DecoderKF<I, A> {
  return {
    decode: K.refine_(from, predicate, (a) => error(a, name, info)).decode,
    _meta: {
      name
    }
  }
}

export function refine<A, B extends A>(
  refinement: Refinement<A, B>,
  name: string,
  info?: ErrorInfo
): <I>(from: DecoderKF<I, A>) => DecoderKF<I, B>
export function refine<A>(
  predicate: Predicate<A>,
  name: string,
  info?: ErrorInfo
): <I>(from: DecoderKF<I, A>) => DecoderKF<I, A>
export function refine<A>(
  predicate: Predicate<A>,
  name: string,
  info?: ErrorInfo
): <I>(from: DecoderKF<I, A>) => DecoderKF<I, A> {
  return (from) => refine_(from, predicate, name, info)
}

export function parse_<I, A, B>(from: DecoderKF<I, A>, decode: DecodeFnHKT<A, B>, name?: string): DecoderKF<I, B> {
  return compose_(from, { decode: decode as any, _meta: { name: name ?? from._meta.name } })
}

export function parse<A, B>(decode: DecodeFnHKT<A, B>, name?: string): <I>(from: DecoderKF<I, A>) => DecoderKF<I, B> {
  return (from) => parse_(from, decode, name)
}

export function nullable(info?: ErrorInfo): <I, A>(or: DecoderKF<I, A>) => DecoderKF<I | null | undefined, A | null> {
  return (or) => ({
    decode: K.nullable_(or, (u, e) =>
      FS.combine(FS.element(DE.member(0, error(u, 'null | undefined', info))), FS.element(DE.member(1, e)))
    ).decode,
    _meta: {
      name: `${or._meta.name} | null | undefined`
    }
  })
}

export function optional(
  info?: ErrorInfo
): <I, A>(or: DecoderKF<I, A>) => DecoderKF<I | null | undefined, O.Option<A>> {
  return (or) => ({
    decode: K.optional_(or, (u, e) =>
      FS.combine(FS.element(DE.member(0, error(u, 'null | undefined', info))), FS.element(DE.member(1, e)))
    ).decode,
    _meta: {
      name: `${or._meta.name} | null | undefined`
    }
  })
}

export function fromStruct<P extends Record<string, DecoderKF<any, any>>>(
  properties: P,
  info?: ErrorInfo
): DecoderKF<{ [K in keyof P]: K.InputOf<P[K]> }, { [K in keyof P]: K.TypeOf<P[K]> }> {
  const name: string = pipe(
    properties,
    R.ifoldl([] as string[], (b, k, a) => [...b, `${k}: ${a._meta.name}`]),
    (as) => `{ ${as.join(', ')} }`
  )
  return pipe(
    {
      decode: K.fromStruct_(properties, (k, e: DecodeErrors) => FS.element(DE.key(k, DE.required, e))).decode,
      _meta: {
        name
      }
    },
    wrapInfo({ name, ...info })
  ) as any
}

export function struct<P extends Record<string, DecoderKF<any, any>>>(
  properties: P,
  info?: ErrorInfo
): DecoderKF<unknown, { [K in keyof P]: K.TypeOf<P[K]> }> {
  return compose_(UnknownRecord(info) as any, fromStruct(properties, info))
}

export function fromPartial<P extends Record<string, DecoderKF<any, any>>>(
  properties: P,
  info?: ErrorInfo
): DecoderKF<Partial<{ [K in keyof P]: K.InputOf<P[K]> }>, Partial<{ [K in keyof P]: K.TypeOf<P[K]> }>> {
  const name: string = pipe(
    properties,
    R.ifoldl([] as string[], (b, k, a) => [...b, `${k}?: ${a._meta.name}`]),
    (as) => `{ ${as.join(', ')} }`
  )
  return pipe(
    {
      decode: K.fromPartial_(properties, (k, e: DecodeErrors) => FS.element(DE.key(k, DE.optional, e))).decode,
      _meta: {
        name
      }
    },
    wrapInfo({ name, ...info })
  ) as any
}

export function partial<P extends Record<string, DecoderKF<any, any>>>(
  properties: P,
  info?: ErrorInfo
): DecoderKF<
  unknown,
  Partial<
    {
      [K in keyof P]: K.TypeOf<P[K]>
    }
  >
> {
  return compose_(UnknownRecord(info) as any, fromPartial(properties, info))
}

export function fromArray<I, A>(
  item: DecoderKF<I, A>,
  info?: ErrorInfo
): DecoderKF<ReadonlyArray<I>, ReadonlyArray<A>> {
  const name = `Array<${item._meta.name}>`
  return pipe(
    {
      decode: K.fromArray_(item, (i, e) => FS.element(DE.index(i, DE.optional, e))).decode,
      _meta: { name }
    },
    wrapInfo({ name, ...info })
  )
}

export function array<A>(item: DecoderKF<unknown, A>, info?: ErrorInfo): DecoderKF<unknown, ReadonlyArray<A>> {
  return compose_(UnknownArray(info), fromArray(item, info))
}

export function fromRecord<I, A>(
  codomain: DecoderKF<I, A>,
  info?: ErrorInfo
): DecoderKF<R.ReadonlyRecord<string, I>, R.ReadonlyRecord<string, A>> {
  const name = `Record<string, ${codomain._meta.name}>`
  return pipe(
    {
      decode: K.fromRecord_(codomain, (k, e) => FS.element(DE.key(k, DE.optional, e))).decode,
      _meta: { name }
    },
    wrapInfo({ name, ...info })
  )
}

export function record<A>(
  codomain: DecoderKF<unknown, A>,
  info?: ErrorInfo
): DecoderKF<unknown, R.ReadonlyRecord<string, A>> {
  return compose_(UnknownRecord(info), fromRecord(codomain, info))
}

export function fromTuple<A extends ReadonlyArray<DecoderKF<any, any>>>(
  ...components: A
): (info?: ErrorInfo) => DecoderKF<[...{ [K in keyof A]: K.InputOf<A[K]> }], [...{ [K in keyof A]: K.TypeOf<A[K]> }]> {
  return (info) => {
    const name: string = pipe(
      components,
      A.map((d) => d._meta.name),
      (as) => `[${as.join(', ')}]`
    )
    return pipe(
      {
        decode: K.fromTuple((i, e: DecodeErrors) => FS.element(DE.index(i, DE.required, e)))(...components).decode,
        _meta: { name }
      },
      wrapInfo({ name, ...info })
    ) as any
  }
}

export function tuple<A extends ReadonlyArray<DecoderKF<any, any>>>(
  ...components: A
): (info?: ErrorInfo) => DecoderKF<unknown, [...{ [K in keyof A]: K.TypeOf<A[K]> }]> {
  return (info) => compose_(UnknownArray(info) as any, fromTuple(...components)(info))
}

export function union(
  info?: ErrorInfo
): <P extends readonly [DecoderKF<any, any>, ...ReadonlyArray<DecoderKF<any, any>>]>(
  ...members: P
) => DecoderKF<K.InputOf<P[keyof P]>, K.TypeOf<P[keyof P]>> {
  return (...members) => {
    const name = members.join(' | ')
    return pipe(
      {
        decode: K.union((i, e: DecodeErrors) => FS.element(DE.member(i, e)))(...members).decode,
        _meta: { name }
      },
      wrapInfo({ name, ...info })
    ) as any
  }
}

export function intersect_<IA, A, IB, B>(
  left: DecoderKF<IA, A>,
  right: DecoderKF<IB, B>,
  info?: ErrorInfo
): DecoderKF<IA & IB, A & B> {
  return pipe(
    {
      decode: K.intersect_(left, right).decode,
      _meta: {
        name: info?.name ?? `${left._meta.name} & ${right._meta.name}`
      }
    },
    wrapInfo({ name: info?.name ?? `${left._meta.name} & ${right._meta.name}` })
  )
}

export function intersect<IB, B>(
  right: DecoderKF<IB, B>,
  info?: ErrorInfo
): <IA, A>(left: DecoderKF<IA, A>) => DecoderKF<IA & IB, A & B> {
  return (left) => intersect_(left, right, info)
}

export function intersectAll<
  A extends readonly [DecoderKF<any, any>, DecoderKF<any, any>, ...(readonly DecoderKF<any, any>[])]
>(
  decoders: A,
  info?: ErrorInfo
): DecoderKF<
  UnionToIntersection<{ [K in keyof A]: K.InputOf<A[K]> }[keyof A]>,
  UnionToIntersection<{ [K in keyof A]: K.TypeOf<A[K]> }[keyof A]>
> {
  const [left, right, ...rest] = decoders

  const decoder = A.foldl_(rest, K.intersect_(left, right), (b, a) => K.intersect_(b, a))
  const name    = info?.name ?? A.map_(decoders, (d) => d._meta.name).join(' & ')
  return pipe({ decode: decoder.decode, _meta: { name } }, wrapInfo({ name, ...info }) as any)
}

export function fromSum_<T extends string, P extends Record<string, DecoderKF<any, any>>>(
  tag: T,
  members: P,
  info?: ErrorInfo
): DecoderKF<K.InputOf<P[keyof P]>, K.TypeOf<P[keyof P]>> {
  const name: string = pipe(
    members,
    R.foldl([] as string[], (b, a) => [...b, a._meta.name]),
    (as) => as.join(' | ')
  )

  const decode = K.sum(tag, members, (tag, value, keys) =>
    FS.element(
      DE.key(
        tag,
        DE.required,
        error(value, keys.length === 0 ? 'never' : keys.map((k) => JSON.stringify(k)).join(' | '))
      )
    )
  ).decode

  return pipe({ decode, _meta: { name } }, wrapInfo({ name, ...info }))
}

export function fromSum<T extends string>(
  tag: T,
  info?: ErrorInfo
): <P extends Record<string, DecoderKF<any, any>>>(
  members: P
) => DecoderKF<K.InputOf<P[keyof P]>, K.TypeOf<P[keyof P]>> {
  return (members) => fromSum_(tag, members, info)
}

export function sum_<T extends string, A>(
  tag: T,
  members: { [K in keyof A]: DecoderKF<unknown, A[K] & Record<T, K>> },
  info?: ErrorInfo
): DecoderKF<unknown, A[keyof A]> {
  return compose_(UnknownRecord(info) as any, fromSum_(tag, members, info) as any)
}

export function sum<T extends string>(
  tag: T,
  info?: ErrorInfo
): <A>(members: { [K in keyof A]: DecoderKF<unknown, A[K] & Record<T, K>> }) => DecoderKF<unknown, A[keyof A]> {
  return (members) => sum_(tag, members, info)
}

export function lazy<I, A>(id: string, f: () => DecoderKF<I, A>, info?: ErrorInfo): DecoderKF<I, A> {
  return pipe(
    {
      decode: K.lazy(id, f, (id, e) => FS.element(DE.lazy(id, e))).decode,
      _meta: {
        name: info?.name ?? id
      }
    },
    wrapInfo({ name: id, ...info })
  )
}

export function runDecoder<I, O, M extends HKT.URIS, C = HKT.Auto>(
  M: MD.MonadDecoder<M, C, DecodeErrors>,
  decoder: DecoderKF<I, O>
): (
  i: I
) => HKT.Kind<
  M,
  C,
  HKT.Initial<C, 'N'>,
  HKT.Initial<C, 'K'>,
  HKT.Initial<C, 'Q'>,
  HKT.Initial<C, 'W'>,
  HKT.Initial<C, 'X'>,
  HKT.Initial<C, 'I'>,
  HKT.Initial<C, 'S'>,
  HKT.Initial<C, 'R'>,
  DecodeErrors,
  O
> {
  return (i) => decoder.decode(M)(i)
}

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

export const Functor = HKT.instance<P.Functor<[HKT.URI<DecoderKFURI>], V>>({
  map_,
  map
})

export const Category = HKT.instance<P.Category<[HKT.URI<DecoderKFURI>], V>>({
  compose_,
  compose,
  id
})
