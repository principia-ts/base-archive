import type { DecodeErrors, ErrorInfo } from './DecodeErrors'
import type { FreeDecoderK } from './FreeDecoderK'
import type * as MD from './MonadDecoder'
import type * as G from '@principia/base/Guard'
import type { Integer } from '@principia/base/Integer'
import type * as O from '@principia/base/Option'
import type { Predicate } from '@principia/base/Predicate'
import type { ReadonlyRecord } from '@principia/base/Record'
import type { Refinement } from '@principia/base/Refinement'
import type { Primitive, UnionToIntersection } from '@principia/base/util/types'

import * as A from '@principia/base/Array'
import * as B from '@principia/base/boolean'
import { pipe } from '@principia/base/function'
import * as HKT from '@principia/base/HKT'
import * as I from '@principia/base/Integer'
import * as N from '@principia/base/number'
import * as R from '@principia/base/Record'
import * as S from '@principia/base/string'
import * as P from '@principia/base/typeclass'
import * as FS from '@principia/free/FreeSemigroup'

import * as DE from './DecodeErrors'
import * as FDE from './FreeDecodeError'
import * as K from './FreeDecoderK'
import { DecoderKURI } from './Modules'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export type V = HKT.V<'I', '_'>

export interface DecoderMetadata {
  readonly name: string
}

export interface DecodeKFn<I, O> {
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

export interface DecodeKFnHKT<I, O> {
  (M: MD.MonadDecoder<HKT.UHKT2<any>, HKT.Auto, DecodeErrors>): (i: I) => HKT.HKT2<any, DecodeErrors, O>
}

export interface DecoderK<I, O> extends FreeDecoderK<I, DecodeErrors, O> {
  readonly label: string
}

export interface DecoderKHKT<I, O> extends K.DecoderKHKT<I, DecodeErrors, O> {
  readonly label: string
}

export type InputOf<X> = K.InputOf<X>
export type TypeOf<X> = K.TypeOf<X>

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function makeDecoderK<I, O>(label: string, decode: DecodeKFnHKT<I, O>): DecoderK<I, O> {
  return {
    label,
    decode: decode as any
  }
}

export function fromRefinement<I, A extends I>(
  refinement: Refinement<I, A>,
  expected: string,
  info?: ErrorInfo
): DecoderK<I, A> {
  return {
    decode: K.fromRefinement(refinement, (i) => DE.error(i, expected, info)).decode,
    label: expected
  }
}

export function fromGuard<I, A extends I>(guard: G.Guard<I, A>, expected: string, info?: ErrorInfo): DecoderK<I, A> {
  return fromRefinement(guard.is, expected, info)
}

export function literal<A extends readonly [Primitive, ...Primitive[]]>(
  ...values: A
): (info?: ErrorInfo) => DecoderK<unknown, A[number]> {
  const label = A.map_(values, (value) => JSON.stringify(value)).join(' | ')
  return (info) => ({
    label,
    decode: K.literal((u, _) => DE.error(u, label, info))(...values).decode
  })
}

/*
 * -------------------------------------------
 * Primitives
 * -------------------------------------------
 */

export function string(info?: ErrorInfo): DecoderK<unknown, string> {
  return fromGuard(S.Guard, 'string', info)
}

export function number(info?: ErrorInfo): DecoderK<unknown, number> {
  return fromGuard(N.Guard, 'number', info)
}

export function integer(info?: ErrorInfo): DecoderK<unknown, Integer> {
  return fromGuard(I.GuardSafe, 'integer', info)
}

export function boolean(info?: ErrorInfo): DecoderK<unknown, boolean> {
  return fromGuard(B.Guard, 'boolean', info)
}

export function UnknownArray(info?: ErrorInfo): DecoderK<unknown, ReadonlyArray<unknown>> {
  return fromGuard(A.GuardUnknownArray, 'Array<unknown>', info)
}

export function UnknownRecord(info?: ErrorInfo): DecoderK<unknown, ReadonlyRecord<string, unknown>> {
  return fromGuard(R.GuardUnknownRecord, 'Record<string, unknown>', info)
}

/*
 * -------------------------------------------
 * Alt
 * -------------------------------------------
 */

export function alt_<I, O>(me: DecoderK<I, O>, that: () => DecoderK<I, O>): DecoderK<I, O> {
  return {
    decode: K.alt_(me, that).decode,
    label: `${me.label} <!> ${that().label}`
  }
}

export function alt<I, O>(that: () => DecoderK<I, O>): (me: DecoderK<I, O>) => DecoderK<I, O> {
  return (me) => alt_(me, that)
}

/*
 * -------------------------------------------
 * Category
 * -------------------------------------------
 */

export function compose_<I, A, B>(from: DecoderK<I, A>, to: DecoderK<A, B>): DecoderK<I, B> {
  return {
    decode: K.compose_(from, to).decode,
    label: `(${from.label} >>> ${to.label})`
  }
}

export function compose<A, B>(to: DecoderK<A, B>): <I>(from: DecoderK<I, A>) => DecoderK<I, B> {
  return (from) => compose_(from, to)
}

export function id<A>(): DecoderK<A, A> {
  return {
    decode: K.id().decode,
    label: 'id'
  }
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<I, A, B>(ia: DecoderK<I, A>, f: (a: A) => B): DecoderK<I, B> {
  return {
    decode: (M) => (i) => M.map_(ia.decode(M)(i), f),
    label: ia.label
  }
}

export function map<A, B>(f: (a: A) => B): <I>(ia: DecoderK<I, A>) => DecoderK<I, B> {
  return (ia) => map_(ia, f)
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function mapLeftWithInput_<I, A>(
  decoder: DecoderK<I, A>,
  f: (input: I, e: DecodeErrors) => DecodeErrors
): DecoderK<I, A> {
  return {
    decode: K.mapLeftWithInput_(decoder, f).decode,
    label: decoder.label
  }
}

export function mapLeftWithInput<I>(
  f: (input: I, e: DecodeErrors) => DecodeErrors
): <A>(decoder: DecoderK<I, A>) => DecoderK<I, A> {
  return (decoder) => mapLeftWithInput_(decoder, f)
}

export function withMessage<I>(
  message: (input: I, e: DecodeErrors) => string
): <A>(decoder: DecoderK<I, A>) => DecoderK<I, A> {
  return mapLeftWithInput((input, e) => FS.Element(FDE.Wrap({ message: message(input, e) }, e)))
}

export function wrapInfo<I, A>(info: ErrorInfo | undefined): (decoder: DecoderK<I, A>) => DecoderK<I, A> {
  return (decoder) => (info ? mapLeftWithInput_(decoder, (_, e) => FS.Element(FDE.Wrap(info, e))) : decoder)
}

export function refine_<I, A, B extends A>(
  from: DecoderK<I, A>,
  refinement: Refinement<A, B>,
  expected: string,
  info?: ErrorInfo
): DecoderK<I, B>
export function refine_<I, A>(
  from: DecoderK<I, A>,
  predicate: Predicate<A>,
  expected: string,
  info?: ErrorInfo
): DecoderK<I, A>
export function refine_<I, A>(
  from: DecoderK<I, A>,
  predicate: Predicate<A>,
  expected: string,
  info?: ErrorInfo
): DecoderK<I, A> {
  return {
    decode: K.refine_(from, predicate, (a) => DE.error(a, expected, info)).decode,
    label: expected
  }
}

export function refine<A, B extends A>(
  refinement: Refinement<A, B>,
  expected: string,
  info?: ErrorInfo
): <I>(from: DecoderK<I, A>) => DecoderK<I, B>
export function refine<A>(
  predicate: Predicate<A>,
  expected: string,
  info?: ErrorInfo
): <I>(from: DecoderK<I, A>) => DecoderK<I, A>
export function refine<A>(
  predicate: Predicate<A>,
  expected: string,
  info?: ErrorInfo
): <I>(from: DecoderK<I, A>) => DecoderK<I, A> {
  return (from) => refine_(from, predicate, expected, info)
}

export function parse_<I, A, B>(from: DecoderK<I, A>, decode: DecodeKFnHKT<A, B>, expected?: string): DecoderK<I, B> {
  return compose_(from, { decode: decode as any, label: expected ?? from.label })
}

export function parse<A, B>(
  decode: DecodeKFnHKT<A, B>,
  expected?: string
): <I>(from: DecoderK<I, A>) => DecoderK<I, B> {
  return (from) => parse_(from, decode, expected)
}

export function nullable(info?: ErrorInfo): <I, A>(or: DecoderK<I, A>) => DecoderK<I | null | undefined, A | null> {
  return (or) => ({
    decode: K.nullable_(or, (u, e) =>
      FS.Combine(FS.Element(FDE.Member(0, DE.error(u, 'null | undefined', info))), FS.Element(FDE.Member(1, e)))
    ).decode,
    label: `${or.label} | null | undefined`
  })
}

export function optional(info?: ErrorInfo): <I, A>(or: DecoderK<I, A>) => DecoderK<I | null | undefined, O.Option<A>> {
  return (or) => ({
    decode: K.optional_(or, (u, e) =>
      FS.Combine(FS.Element(FDE.Member(0, DE.error(u, 'null | undefined', info))), FS.Element(FDE.Member(1, e)))
    ).decode,
    label: `${or.label} | null | undefined`
  })
}

export function fromStruct<P extends Record<string, DecoderK<any, any>>>(
  properties: P,
  info?: ErrorInfo
): DecoderK<{ [K in keyof P]: K.InputOf<P[K]> }, { [K in keyof P]: K.TypeOf<P[K]> }> {
  const label: string = pipe(
    properties,
    R.ifoldl([] as string[], (b, k, a) => {
      b.push(`${k}: ${a.label}`)
      return b
    }),
    (as) => `{ ${as.join(', ')} }`
  )
  return pipe(
    {
      decode: K.fromStruct_(properties, (k, e: DecodeErrors) => FS.Element(FDE.Key(k, FDE.required, e))).decode,
      label
    },
    wrapInfo({ label, ...info })
  ) as any
}

export function struct<P extends Record<string, DecoderK<any, any>>>(
  properties: P,
  info?: ErrorInfo
): DecoderK<unknown, { [K in keyof P]: K.TypeOf<P[K]> }> {
  return compose_(UnknownRecord(info) as any, fromStruct(properties, info))
}

export function fromPartial<P extends Record<string, DecoderK<any, any>>>(
  properties: P,
  info?: ErrorInfo
): DecoderK<Partial<{ [K in keyof P]: K.InputOf<P[K]> }>, Partial<{ [K in keyof P]: K.TypeOf<P[K]> }>> {
  const label: string = pipe(
    properties,
    R.ifoldl([] as string[], (b, k, a) => {
      b.push(`${k}?: ${a.label}`)
      return b
    }),
    (as) => `{ ${as.join(', ')} }`
  )
  return pipe(
    {
      decode: K.fromPartial_(properties, (k, e: DecodeErrors) => FS.Element(FDE.Key(k, FDE.optional, e))).decode,
      label
    },
    wrapInfo({ label, ...info })
  ) as any
}

export function partial<P extends Record<string, DecoderK<any, any>>>(
  properties: P,
  info?: ErrorInfo
): DecoderK<
  unknown,
  Partial<
    {
      [K in keyof P]: K.TypeOf<P[K]>
    }
  >
> {
  return compose_(UnknownRecord(info) as any, fromPartial(properties, info))
}

export function fromArray<I, A>(item: DecoderK<I, A>, info?: ErrorInfo): DecoderK<ReadonlyArray<I>, ReadonlyArray<A>> {
  const label = `Array<${item.label}>`
  return pipe(
    {
      decode: K.fromArray_(item, (i, e) => FS.Element(FDE.Index(i, FDE.optional, e))).decode,
      label
    },
    wrapInfo({ label, ...info })
  )
}

export function array<A>(item: DecoderK<unknown, A>, info?: ErrorInfo): DecoderK<unknown, ReadonlyArray<A>> {
  return compose_(UnknownArray(info), fromArray(item, info))
}

export function fromRecord<I, A>(
  codomain: DecoderK<I, A>,
  info?: ErrorInfo
): DecoderK<R.ReadonlyRecord<string, I>, R.ReadonlyRecord<string, A>> {
  const label = `Record<string, ${codomain.label}>`
  return pipe(
    {
      decode: K.fromRecord_(codomain, (k, e) => FS.Element(FDE.Key(k, FDE.optional, e))).decode,
      label
    },
    wrapInfo({ label, ...info })
  )
}

export function record<A>(
  codomain: DecoderK<unknown, A>,
  info?: ErrorInfo
): DecoderK<unknown, R.ReadonlyRecord<string, A>> {
  return compose_(UnknownRecord(info), fromRecord(codomain, info))
}

export function fromTuple<A extends ReadonlyArray<DecoderK<any, any>>>(
  ...components: A
): (info?: ErrorInfo) => DecoderK<[...{ [K in keyof A]: K.InputOf<A[K]> }], [...{ [K in keyof A]: K.TypeOf<A[K]> }]> {
  return (info) => {
    const label: string = pipe(
      components,
      A.map((d) => d.label),
      (as) => `[${as.join(', ')}]`
    )
    return pipe(
      {
        decode: K.fromTuple((i, e: DecodeErrors) => FS.Element(FDE.Index(i, FDE.required, e)))(...components).decode,
        label
      },
      wrapInfo({ label, ...info })
    ) as any
  }
}

export function tuple<A extends ReadonlyArray<DecoderK<any, any>>>(
  ...components: A
): (info?: ErrorInfo) => DecoderK<unknown, [...{ [K in keyof A]: K.TypeOf<A[K]> }]> {
  return (info) => compose_(UnknownArray(info) as any, fromTuple(...components)(info))
}

export function union(
  info?: ErrorInfo
): <P extends readonly [DecoderK<any, any>, ...ReadonlyArray<DecoderK<any, any>>]>(
  ...members: P
) => DecoderK<K.InputOf<P[keyof P]>, K.TypeOf<P[keyof P]>> {
  return (...members) => {
    const label = members.join(' | ')
    return pipe(
      {
        decode: K.union((i, e: DecodeErrors) => FS.Element(FDE.Member(i, e)))(...members).decode,
        label
      },
      wrapInfo({ label, ...info })
    ) as any
  }
}

export function intersect_<IA, A, IB, B>(
  left: DecoderK<IA, A>,
  right: DecoderK<IB, B>,
  info?: ErrorInfo
): DecoderK<IA & IB, A & B> {
  return pipe(
    {
      decode: K.intersect_(left, right).decode,
      label: info?.label ?? `${left.label} & ${right.label}`
    },
    wrapInfo({ label: info?.label ?? `${left.label} & ${right.label}` })
  )
}

export function intersect<IB, B>(
  right: DecoderK<IB, B>,
  info?: ErrorInfo
): <IA, A>(left: DecoderK<IA, A>) => DecoderK<IA & IB, A & B> {
  return (left) => intersect_(left, right, info)
}

export function intersectAll<
  A extends readonly [DecoderK<any, any>, DecoderK<any, any>, ...(readonly DecoderK<any, any>[])]
>(
  decoders: A,
  info?: ErrorInfo
): DecoderK<
  UnionToIntersection<{ [K in keyof A]: K.InputOf<A[K]> }[keyof A]>,
  UnionToIntersection<{ [K in keyof A]: K.TypeOf<A[K]> }[keyof A]>
> {
  const [left, right, ...rest] = decoders

  const decoder = A.foldl_(rest, K.intersect_(left, right), (b, a) => K.intersect_(b, a))
  const label   = info?.label ?? A.map_(decoders, (d) => d.label).join(' & ')
  return pipe({ decode: decoder.decode, label }, wrapInfo({ label, ...info }) as any)
}

export function fromSum_<T extends string, P extends Record<string, DecoderK<any, any>>>(
  tag: T,
  members: P,
  info?: ErrorInfo
): DecoderK<K.InputOf<P[keyof P]>, K.TypeOf<P[keyof P]>> {
  const label: string = pipe(
    members,
    R.foldl([] as string[], (b, a) => {
      b.push(a.label)
      return b
    }),
    (as) => as.join(' | ')
  )

  const decode = K.sum(tag, members, (tag, value, keys) =>
    FS.Element(
      FDE.Key(
        tag,
        FDE.required,
        DE.error(value, keys.length === 0 ? 'never' : keys.map((k) => JSON.stringify(k)).join(' | '))
      )
    )
  ).decode

  return pipe({ decode, label }, wrapInfo({ label, ...info }))
}

export function fromSum<T extends string>(
  tag: T,
  info?: ErrorInfo
): <P extends Record<string, DecoderK<any, any>>>(members: P) => DecoderK<K.InputOf<P[keyof P]>, K.TypeOf<P[keyof P]>> {
  return (members) => fromSum_(tag, members, info)
}

export function sum_<T extends string, A>(
  tag: T,
  members: { [K in keyof A]: DecoderK<unknown, A[K] & Record<T, K>> },
  info?: ErrorInfo
): DecoderK<unknown, A[keyof A]> {
  return compose_(UnknownRecord(info) as any, fromSum_(tag, members, info) as any)
}

export function sum<T extends string>(
  tag: T,
  info?: ErrorInfo
): <A>(members: { [K in keyof A]: DecoderK<unknown, A[K] & Record<T, K>> }) => DecoderK<unknown, A[keyof A]> {
  return (members) => sum_(tag, members, info)
}

export function lazy<I, A>(id: string, f: () => DecoderK<I, A>, info?: ErrorInfo): DecoderK<I, A> {
  return pipe(
    {
      decode: K.lazy(id, f, (id, e) => FS.Element(FDE.Lazy(id, e))).decode,
      label: info?.label ?? id
    },
    wrapInfo({ label: id, ...info })
  )
}

export function runDecoder<I, O, M extends HKT.URIS, C = HKT.Auto>(
  M: MD.MonadDecoder<M, C, DecodeErrors>,
  decoder: DecoderK<I, O>
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

export const Functor: P.Functor<[HKT.URI<DecoderKURI>], V> = P.Functor({
  map_
})

export const Category = HKT.instance<P.Category<[HKT.URI<DecoderKURI>], V>>({
  compose_,
  compose,
  id
})

export { DecoderKURI }
