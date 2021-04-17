import type { DecoderURI } from './Modules'
import type { CastToNumber, Intersectable } from './util'
import type { Lazy } from '@principia/base/function'
import type { Guard } from '@principia/base/Guard'
import type { Hash } from '@principia/base/Hash'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { Refinement } from '@principia/base/Refinement'
import type { RoseTree } from '@principia/base/RoseTree'
import type { FSync } from '@principia/base/Sync'
import type { These } from '@principia/base/These'
import type { EnforceNonEmptyRecord, Mutable, Primitive, UnionToIntersection } from '@principia/base/util/types'

import * as A from '@principia/base/Array'
import { Either } from '@principia/base/Either'
import * as Ev from '@principia/base/Eval'
import { flow, memoize, pipe } from '@principia/base/function'
import * as G from '@principia/base/Guard'
import * as HS from '@principia/base/HashSet'
import * as HKT from '@principia/base/HKT'
import * as O from '@principia/base/Option'
import * as R from '@principia/base/Record'
import * as RT from '@principia/base/RoseTree'
import * as Set from '@principia/base/Set'
import * as S from '@principia/base/Sync'
import * as Th from '@principia/base/These'
import * as P from '@principia/base/typeclass'

import * as DE from './DecodeError'
import { _intersect, isUnknownRecord } from './util'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Decoder<I, E, A> {
  readonly label: string
  readonly decode: (i: I) => These<E, A>
}

export type V = HKT.V<'I', '-'> & HKT.V<'E', '+'>

export interface UDecoder<E, A> extends Decoder<unknown, E, A> {}

export type InputOf<D> = D extends Decoder<infer I, any, any> ? I : never
export type ErrorOf<D> = D extends Decoder<any, infer E, any> ? E : never
export type TypeOf<D> = D extends Decoder<any, any, infer A> ? A : never

export type AnyD = Decoder<any, any, any>
export type AnyUD = UDecoder<any, any>

/*
 * -------------------------------------------
 * constructors
 * -------------------------------------------
 */

export interface FromRefinementD<A, W, E, B extends A> extends Decoder<A, DE.RefinementE<E | W>, B> {
  readonly _tag: 'RefinementD'
  readonly refinement: Refinement<A, B>
  readonly error: (a: A) => E
  readonly warn: (a: A) => O.Option<W>
}

export function fromRefinement<A, W, E, B extends A>(
  refinement: Refinement<A, B>,
  error: (a: A) => E,
  warn: (a: A) => O.Option<W>,
  label: string
): FromRefinementD<A, W, E, B> {
  return {
    _tag: 'RefinementD',
    label,
    refinement,
    error,
    warn,
    decode: (a) => {
      if (refinement(a)) {
        const w = warn(a)
        return O.isSome(w) ? Th.Both(DE.refinementE(w.value), a) : Th.Right(a)
      } else {
        return Th.Left(DE.refinementE(error(a)))
      }
    }
  }
}

export interface FromParserD<I, E, A> extends Decoder<I, DE.ParserE<E>, A> {
  readonly _tag: 'FromParseD'
  readonly parser: (i: I) => These<E, A>
}

/**
 * Constructs a Decoder from a parsing function
 */
export function fromParser<I, E, A>(parser: (i: I) => These<E, A>, label: string): FromParserD<I, E, A> {
  return {
    _tag: 'FromParseD',
    label,
    parser,
    decode: flow(parser, Th.mapLeft(DE.parserE))
  }
}

/**
 * Constructs a Decoder from a Guard
 */
export function fromGuard<I, W, E, A extends I>(
  guard: Guard<I, A>,
  error: (i: I) => E,
  warn: (i: I) => O.Option<W>,
  label: string
): FromRefinementD<I, W, E, A> {
  return fromRefinement(guard.is, error, warn, label)
}

export interface LiteralD<A extends readonly [Primitive, ...ReadonlyArray<Primitive>]>
  extends UDecoder<DE.LeafE<DE.LiteralE<A[number]>>, A[number]> {
  readonly _tag: 'LiteralD'
  readonly literals: A
}

/**
 * Constructs a Decoder from one or more literals
 */
export function literal<A extends readonly [Primitive, ...ReadonlyArray<Primitive>]>(...literals: A): LiteralD<A> {
  const literalsGuard = G.literal(...literals)
  return {
    _tag: 'LiteralD',
    label: pipe(
      literals,
      A.map((l) => String(l)),
      A.join(' | ')
    ),
    literals,
    decode: (i) => (literalsGuard.is(i) ? Th.Right(i) : Th.Left(DE.leafE(DE.literalE(i, literals))))
  }
}

/*
 * -------------------------------------------
 * primitives
 * -------------------------------------------
 */

export interface stringUD extends UDecoder<DE.StringLE, string> {
  readonly _tag: 'stringUD'
}

export const string: stringUD = {
  _tag: 'stringUD',
  label: 'string',
  decode: (u) => (typeof u === 'string' ? Th.Right(u) : Th.Left(DE.leafE(DE.stringE(u))))
}

export interface numberUD extends UDecoder<DE.InfinityLE | DE.NaNLE | DE.NumberLE, number> {
  readonly _tag: 'numberUD'
}

export const number: numberUD = {
  _tag: 'numberUD',
  label: 'number',
  decode: (u) =>
    typeof u === 'number'
      ? isNaN(u)
        ? Th.Both(DE.leafE(DE.nanE), u)
        : !isFinite(u)
        ? Th.Both(DE.leafE(DE.infinityE), u)
        : Th.Right(u)
      : Th.Left(DE.leafE(DE.numberE(u)))
}

export interface booleanUD extends UDecoder<DE.BooleanLE, boolean> {
  readonly _tag: 'booleanUD'
}

export const boolean: booleanUD = {
  _tag: 'booleanUD',
  label: 'boolean',
  decode: (u) => (typeof u === 'boolean' ? Th.Right(u) : Th.Left(DE.leafE(DE.booleanE(u))))
}

export interface bigintFromStringUD extends UDecoder<DE.StringLE | DE.BigIntLE, bigint> {
  readonly _tag: 'bigintFromStringD'
}

export const bigintFromString: bigintFromStringUD = {
  _tag: 'bigintFromStringD',
  label: 'bigint',
  decode: (u) => {
    if (typeof u !== 'string') {
      return Th.Left(DE.leafE(DE.stringE(u)))
    } else {
      try {
        return Th.Right(BigInt(u))
      } catch (_) {
        return Th.Left(DE.leafE(DE.bigIntE(u)))
      }
    }
  }
}

/*
 * -------------------------------------------
 * unknown containters
 * -------------------------------------------
 */

export interface UnknownArrayUD extends Decoder<unknown, DE.UnknownArrayLE, Array<unknown>> {
  readonly _tag: 'UnknownArrayUD'
}

export const UnknownArray: UnknownArrayUD = {
  _tag: 'UnknownArrayUD',
  label: 'Array<unknown>',
  decode: (u) => (Array.isArray(u) ? Th.Right(u) : Th.Left(DE.leafE(DE.unknownArrayE(u))))
}

export interface UnknownNonEmptyArrayUD extends UDecoder<DE.UnknownArrayLE | DE.EmptyLE, NonEmptyArray<unknown>> {
  readonly _tag: 'NonEmptyArrayUD'
}

export const UnknownNonEmptyArray: UnknownNonEmptyArrayUD = {
  _tag: 'NonEmptyArrayUD',
  label: 'NonEmptyArray<unknown>',
  decode: (u) =>
    Array.isArray(u)
      ? u.length > 0
        ? Th.Right(u as any)
        : Th.Left(DE.leafE(DE.emptyE))
      : Th.Left(DE.leafE(DE.unknownArrayE(u)))
}

export interface UnknownRecordUD extends UDecoder<DE.UnknownRecordLE, Record<PropertyKey, unknown>> {
  readonly _tag: 'UnknownRecordUD'
}

export const UnknownRecord: UnknownRecordUD = {
  _tag: 'UnknownRecordUD',
  label: 'Record<string, unknown>',
  decode: (u) => (isUnknownRecord(u) ? Th.Right(u) : Th.Left(DE.leafE(DE.unknownRecordE(u))))
}

/*
 * -------------------------------------------
 * datatypes
 * -------------------------------------------
 */

export const dateFromString = pipe(
  string,
  parse((a) => {
    const d = new Date(a)
    return isNaN(d.getTime()) ? pipe(DE.dateFromStringE(a), DE.leafE, Th.Left) : Th.Right(d)
  }, 'DateFromString')
)

export const None: StructD<{ _tag: LiteralD<['None']> }> = struct({
  _tag: literal('None')
})

export function Some<D extends AnyUD>(value: D): StructD<{ _tag: LiteralD<['Some']>, value: D }> {
  return struct({
    _tag: literal('Some'),
    value
  })
}

export function Option<D extends AnyUD>(
  value: D
): SumD<
  '_tag',
  {
    None: StructD<{ _tag: LiteralD<['None']> }>
    Some: StructD<{ _tag: LiteralD<['Some']>, value: D }>
  }
> {
  return sum('_tag')({
    None,
    Some: Some(value)
  })
}

export function Left<D extends AnyUD>(left: D): StructD<{ _tag: LiteralD<['Left']>, left: D }> {
  return struct({
    _tag: literal('Left'),
    left
  })
}

export function Right<D extends AnyUD>(right: D): StructD<{ _tag: LiteralD<['Right']>, right: D }> {
  return struct({
    _tag: literal('Right'),
    right
  })
}

export function Either<L extends AnyUD, R extends AnyUD>(
  left: L,
  right: R
): SumD<
  '_tag',
  {
    Left: StructD<{ _tag: LiteralD<['Left']>, left: L }>
    Right: StructD<{ _tag: LiteralD<['Right']>, right: R }>
  }
> {
  return sum('_tag')({
    Left: Left(left),
    Right: Right(right)
  })
}

export function SetFromArray<D extends AnyD>(item: D, E: P.Eq<TypeOf<D>>) {
  return pipe(array(item), map(Set.fromArray(E)))
}

export function HashSetFromArray<D extends AnyD>(item: D, H: Hash<TypeOf<D>>, E: P.Eq<TypeOf<D>>) {
  return pipe(
    array(item),
    map((is) =>
      pipe(
        HS.make({ ...H, ...E }),
        HS.mutate((set) => {
          for (let i = 0; i < is.length; i++) {
            HS.add_(set, is[i])
          }
        })
      )
    )
  )
}

/*
 * -------------------------------------------
 * combinators
 * -------------------------------------------
 */

export interface ParseD<From extends AnyD, E, B> extends CompositionD<From, FromParserD<TypeOf<From>, E, B>> {}
export function parse_<From extends Decoder<any, any, any>, E, B>(
  from: From,
  parser: (a: TypeOf<From>) => These<E, B>,
  label: string
): ParseD<From, E, B>
export function parse_<I, E, A, E1, B>(
  from: Decoder<I, E, A>,
  p: (a: A) => These<E1, B>,
  label: string
): ParseD<typeof from, E1, B> {
  return compose_(from, fromParser(p, label))
}

export function parse<From extends Decoder<any, any, any>, E, B>(
  parser: (a: TypeOf<From>) => These<E, B>,
  label: string
): (from: From) => ParseD<From, E, B>
export function parse<A, E1, B>(
  p: (a: A) => These<E1, B>,
  label: string
): <I, E>(from: Decoder<I, E, A>) => ParseD<typeof from, E1, B> {
  return (from) => parse_(from, p, label)
}

export interface RefineD<From extends AnyD, W, E, B extends TypeOf<From>>
  extends CompositionD<From, FromRefinementD<TypeOf<From>, W, E, B>> {}
export function refine_<From extends AnyD, W, E, B extends TypeOf<From>>(
  from: From,
  refinement: Refinement<TypeOf<From>, B>,
  error: (a: TypeOf<From>) => E,
  warn: (a: TypeOf<From>) => O.Option<W>,
  label: string
): RefineD<From, W, E, B> {
  return compose_(from, fromRefinement(refinement, error, warn, label))
}

export function refine<From extends AnyD, W, E, B extends TypeOf<From>>(
  refinement: Refinement<TypeOf<From>, B>,
  error: (a: TypeOf<From>) => E,
  warn: (a: TypeOf<From>) => O.Option<W>,
  label: string
): (from: From) => RefineD<From, W, E, B> {
  return (from) => refine_(from, refinement, error, warn, label)
}

export interface NullableD<Or extends AnyD>
  extends Decoder<InputOf<Or> | undefined | null, DE.NullableE<ErrorOf<Or>>, TypeOf<Or> | null> {
  readonly _tag: 'NullableD'
  readonly or: Or
}
export function nullable<Or extends AnyD>(or: Or): NullableD<Or> {
  return {
    _tag: 'NullableD',
    label: `${or.label} | null | undefined`,
    or,
    decode: (i) => (i == null ? Th.Right(null) : pipe(or.decode(i), Th.mapLeft(DE.nullableE)))
  }
}

export interface OptionalD<Or extends AnyD>
  extends Decoder<InputOf<Or> | null | undefined, DE.OptionalE<ErrorOf<Or>>, O.Option<TypeOf<Or>>> {
  readonly _tag: 'OptionalD'
  readonly or: Or
}
export function optional<Or extends AnyD>(or: Or): OptionalD<Or> {
  return {
    _tag: 'OptionalD',
    label: `${or.label} | null | undefined`,
    or,
    decode: (i) => (i == null ? Th.Right(O.None()) : pipe(or.decode(i), Th.bimap(DE.optionalE, O.Some)))
  }
}

/*
 * -------------------------------------------
 * struct
 * -------------------------------------------
 */

export interface UnexpectedKeysD<P>
  extends Decoder<{ [K in keyof P]: InputOf<P[K]> }, DE.UnexpectedKeysE, { [K in keyof P]: InputOf<P[K]> }> {
  readonly _tag: 'UnexpectedKeysD'
  readonly properties: P
}
export function unexpectedKeys<P extends Record<string, unknown>>(properties: P): UnexpectedKeysD<P> {
  return {
    _tag: 'UnexpectedKeysD',
    label: 'UnexpectedKeysD',
    properties,
    decode: (ur) => {
      const ws: Array<string> = []
      const mut_out: any      = {}
      for (const key in properties) {
        if (key in ur) {
          mut_out[key] = ur[key]
        }
      }
      for (const key in ur) {
        if (!(key in mut_out)) {
          ws.push(key)
        }
      }
      return A.isNonEmpty(ws) ? Th.Both(DE.unexpectedKeysE(ws), mut_out) : Th.Right(mut_out)
    }
  }
}

export interface MissingKeysD<P>
  extends Decoder<Record<PropertyKey, unknown>, DE.MissingKeysE, Record<keyof P, unknown>> {
  readonly _tag: 'MissingKeysD'
  readonly properties: P
}
export function missingKeys<P extends Record<PropertyKey, unknown>>(properties: P): MissingKeysD<P> {
  return {
    _tag: 'MissingKeysD',
    label: 'MissingKeysD',
    properties,
    decode: (ur) => {
      const es: Array<string> = []
      for (const key in properties) {
        if (!(key in ur)) {
          es.push(key)
        }
      }
      return A.isNonEmpty(es) ? Th.Left(DE.missingKeysE(es)) : Th.Right(ur)
    }
  }
}

export interface FromStructD<P>
  extends Decoder<
    { [K in keyof P]: InputOf<P[K]> },
    DE.StructE<{ [K in keyof P]: DE.RequiredKeyE<K, ErrorOf<P[K]>> }[keyof P]>,
    { [K in keyof P]: TypeOf<P[K]> }
  > {
  readonly _tag: 'FromStructD'
  readonly properties: P
}
export function fromStruct<P extends Record<string, AnyD>>(properties: P): FromStructD<P> {
  const label = `{ ${pipe(
    properties,
    R.ifoldl([] as string[], (b, k, a) => {
      b.push(`${k}: ${a.label}`)
      return b
    }),
    A.join(', ')
  )} }`

  return {
    _tag: 'FromStructD',
    properties,
    label,
    decode: (ur) => {
      const es: Array<DE.RequiredKeyE<string, any>> = []
      const mut_r: any                              = {}

      let isBoth = true
      for (const k in properties) {
        const de = properties[k].decode(ur[k])
        Th.match_(
          de,
          (error) => {
            isBoth = false
            es.push(DE.requiredKeyE(k, error))
          },
          (a) => {
            mut_r[k] = a
          },
          (w, a) => {
            es.push(DE.requiredKeyE(k, w))
            mut_r[k] = a
          }
        )
      }

      return A.isNonEmpty(es) ? (isBoth ? Th.Both(DE.structE(es), mut_r) : Th.Left(DE.structE(es))) : Th.Right(mut_r)
    }
  }
}

export interface StructD<P extends Record<PropertyKey, AnyUD>>
  extends CompositionD<
    CompositionD<CompositionD<UnknownRecordUD, UnexpectedKeysD<P>>, MissingKeysD<P>>,
    FromStructD<P>
  > {}
export function struct<P extends Record<string, AnyUD>>(properties: P): StructD<P>
export function struct(properties: Record<string, AnyUD>): StructD<typeof properties> {
  return pipe(
    UnknownRecord,
    compose(unexpectedKeys(properties)),
    compose(missingKeys(properties)),
    compose(fromStruct(properties))
  )
}

/*
 * -------------------------------------------
 * partial
 * -------------------------------------------
 */

export interface FromPartialD<P>
  extends Decoder<
    Partial<{ [K in keyof P]: InputOf<P[K]> }>,
    DE.PartialE<{ [K in keyof P]: DE.OptionalKeyE<K, ErrorOf<P[K]>> }[keyof P]>,
    Partial<{ [K in keyof P]: TypeOf<P[K]> }>
  > {
  readonly _tag: 'FromPartialD'
  readonly properties: P
}
export function fromPartial<P extends Record<string, AnyD>>(properties: P): FromPartialD<P> {
  const label = `{ ${pipe(
    properties,
    R.ifoldl([] as string[], (b, k, a) => {
      b.push(`${k}?: ${a.label}`)
      return b
    }),
    A.join(', ')
  )} }`
  return {
    _tag: 'FromPartialD',
    properties,
    label,
    decode: (ur) => {
      const es: Array<DE.OptionalKeyE<string, any>> = []
      const mut_r: any                              = {}

      let isBoth = true
      for (const key in properties) {
        if (!(key in ur)) {
          continue
        }
        if (ur[key] === undefined) {
          mut_r[key] = undefined
          continue
        }
        const de = properties[key].decode(ur[key])
        Th.match_(
          de,
          (error) => {
            isBoth = false
            es.push(DE.optionalKeyE(key, error))
          },
          (a) => {
            mut_r[key] = a
          },
          (w, a) => {
            es.push(DE.optionalKeyE(key, w))
            mut_r[key] = a
          }
        )
      }
      return A.isNonEmpty(es) ? (isBoth ? Th.Both(DE.partialE(es), mut_r) : Th.Left(DE.partialE(es))) : Th.Right(mut_r)
    }
  }
}

export interface PartialD<P> extends CompositionD<CompositionD<UnknownRecordUD, UnexpectedKeysD<P>>, FromPartialD<P>> {}
export function partial<P extends Record<string, AnyUD>>(properties: P): PartialD<P>
export function partial(properties: Record<string, AnyUD>): PartialD<typeof properties> {
  return pipe(UnknownRecord, compose(unexpectedKeys(properties)), compose(fromPartial(properties)))
}

/*
 * -------------------------------------------
 * array
 * -------------------------------------------
 */

export interface FromArrayD<Item>
  extends Decoder<Array<InputOf<Item>>, DE.ArrayE<DE.OptionalIndexE<number, ErrorOf<Item>>>, Array<TypeOf<Item>>> {
  readonly _tag: 'FromArrayD'
  readonly item: Item
}
export function fromArray<Item extends AnyD>(item: Item): FromArrayD<Item> {
  return {
    _tag: 'FromArrayD',
    label: `Array<${item.label}>`,
    item,
    decode: (i) => {
      const errors: Array<DE.OptionalIndexE<number, any>> = []
      const result: Array<TypeOf<Item>>                   = []

      let isBoth = true
      for (let index = 0; index < i.length; index++) {
        const de = item.decode(i[index])
        Th.match_(
          de,
          (error) => {
            isBoth = false
            errors.push(DE.optionalIndexE(index, error))
          },
          (a) => {
            result.push(a)
          },
          (w, a) => {
            errors.push(DE.optionalIndexE(index, w))
            result.push(a)
          }
        )
      }
      return A.isNonEmpty(errors)
        ? isBoth
          ? Th.Both(DE.arrayE(errors), result)
          : Th.Left(DE.arrayE(errors))
        : Th.Right(result)
    }
  }
}

export interface ArrayD<Item> extends CompositionD<UnknownArrayUD, FromArrayD<Item>> {}
export function array<Item extends AnyUD>(item: Item): ArrayD<Item>
export function array<E, A>(item: Decoder<unknown, E, A>): ArrayD<typeof item> {
  return compose_(UnknownArray, fromArray(item))
}

export interface FromNonEmptyArrayD<Item extends AnyD>
  extends Decoder<
    Array<InputOf<Item>>,
    DE.LeafE<DE.EmptyE> | DE.ArrayE<DE.OptionalIndexE<number, ErrorOf<Item>>>,
    NonEmptyArray<TypeOf<Item>>
  > {
  readonly _tag: 'FromNonEmptyArrayD'
  readonly item: Item
}
export function fromNonEmptyArray<Item extends AnyD>(item: Item): FromNonEmptyArrayD<Item> {
  return {
    _tag: 'FromNonEmptyArrayD',
    label: `NonEmptyArray<${item.label}>`,
    item,
    decode: (i) =>
      i.length > 0
        ? ((fromArray(item).decode(i) as unknown) as These<
            DE.ArrayE<DE.OptionalIndexE<number, ErrorOf<Item>>>,
            NonEmptyArray<TypeOf<Item>>
          >)
        : Th.Left(DE.leafE(DE.emptyE))
  }
}

export interface NonEmptyArrayD<Item extends AnyUD>
  extends UDecoder<
    DE.ArrayE<DE.OptionalIndexE<number, ErrorOf<Item>>> | DE.EmptyLE | DE.UnknownArrayLE,
    NonEmptyArray<TypeOf<Item>>
  > {
  readonly _tag: 'NonEmptyArrayD'
  readonly item: Item
}
export function nonEmptyArray<Item extends AnyUD>(item: Item): NonEmptyArrayD<Item> {
  const { decode, label } = compose_(UnknownNonEmptyArray, fromNonEmptyArray(item) as any)
  return {
    _tag: 'NonEmptyArrayD',
    label,
    decode: decode as any,
    item
  }
}

/*
 * -------------------------------------------
 * tuple
 * -------------------------------------------
 */

export interface FromTupleD<C extends ReadonlyArray<AnyD>>
  extends Decoder<
    { readonly [K in keyof C]: InputOf<C[K]> },
    DE.TupleE<{ [K in keyof C]: DE.RequiredIndexE<CastToNumber<K>, ErrorOf<C[K]>> }[number]>,
    { [K in keyof C]: TypeOf<C[K]> }
  > {
  readonly _tag: 'FromTupleD'
  readonly components: C
}
export function fromTuple<C extends ReadonlyArray<AnyD>>(...components: C): FromTupleD<C> {
  const label = `[ ${pipe(
    components,
    A.map((d) => d.label),
    A.join(', ')
  )} ]`
  return {
    _tag: 'FromTupleD',
    label,
    components,
    decode: (is) => {
      const errors: Array<DE.RequiredIndexE<number, any>> = []

      const mut_r: any = []

      let isBoth = true
      for (let index = 0; index < components.length; index++) {
        const i  = is[index]
        const de = components[index].decode(i)
        Th.match_(
          de,
          (error) => {
            isBoth = false
            errors.push(DE.requiredIndexE(index, error))
          },
          (a) => {
            mut_r[index] = a
          },
          (w, a) => {
            mut_r[index] = a
            errors.push(DE.requiredIndexE(index, w))
          }
        )
      }
      return A.isNonEmpty(errors)
        ? isBoth
          ? Th.Both(DE.tupleE(errors), mut_r)
          : Th.Left(DE.tupleE(errors))
        : Th.Right(mut_r)
    }
  }
}

export interface UnexpectedIndicesD<C>
  extends Decoder<
    { readonly [K in keyof C]: InputOf<C[K]> },
    DE.UnexpectedIndicesE,
    { [K in keyof C]: InputOf<C[K]> }
  > {
  readonly _tag: 'UnexpectedComponentsD'
  readonly components: C
}
export function unexpectedIndices<C extends ReadonlyArray<unknown>>(...components: C): UnexpectedIndicesD<C> {
  return {
    _tag: 'UnexpectedComponentsD',
    label: 'UnexpectedComponentsD',
    components,
    decode: (us) => {
      const ws: Array<number> = []
      for (let index = components.length; index < us.length; index++) {
        ws.push(index)
      }
      return A.isNonEmpty(ws) ? Th.Both(DE.unexpectedIndicesE(ws), us.slice(0, components.length) as any) : Th.Right(us)
    }
  }
}

export interface MissingIndicesD<C> extends Decoder<Array<unknown>, DE.MissingIndicesE, { [K in keyof C]: unknown }> {
  readonly _tag: 'MissingComponentsD'
  readonly components: C
}
export function missingIndicesD<C extends ReadonlyArray<unknown>>(...components: C): MissingIndicesD<C> {
  return {
    _tag: 'MissingComponentsD',
    label: 'MissingComponentsD',
    components,
    decode: (us) => {
      const es: Array<number> = []
      const len               = us.length
      for (let index = 0; index < components.length; index++) {
        if (len < index) {
          es.push(index)
        }
      }
      return A.isNonEmpty(es) ? Th.Left(DE.missingIndicesE(es)) : Th.Right(us as any)
    }
  }
}

export interface TupleD<C extends ReadonlyArray<AnyUD>>
  extends CompositionD<
    CompositionD<CompositionD<UnknownArrayUD, UnexpectedIndicesD<C>>, MissingIndicesD<C>>,
    FromTupleD<C>
  > {}
export function tuple<C extends ReadonlyArray<AnyUD>>(...components: C): TupleD<C>
export function tuple(...components: ReadonlyArray<AnyUD>): TupleD<typeof components> {
  return pipe(
    UnknownArray,
    compose(unexpectedIndices(...components)),
    compose(missingIndicesD(...components)),
    compose(fromTuple(...components))
  )
}

/*
 * -------------------------------------------
 * record
 * -------------------------------------------
 */

export interface FromRecordD<Codomain>
  extends Decoder<
    Record<string, InputOf<Codomain>>,
    DE.RecordE<DE.OptionalKeyE<string, ErrorOf<Codomain>>>,
    Record<string, TypeOf<Codomain>>
  > {
  readonly _tag: 'FromRecordD'
  readonly codomain: Codomain
}
export function fromRecord<Codomain extends AnyD>(codomain: Codomain): FromRecordD<Codomain> {
  return {
    _tag: 'FromRecordD',
    label: `Record<string, ${codomain.label}>`,
    codomain,
    decode: (i) => {
      const errors: Array<DE.OptionalKeyE<string, any>> = []
      const mut_res: Record<string, any>                = {}

      let isBoth = true
      for (const key in i) {
        const value = i[key]
        const de    = codomain.decode(value)
        Th.match_(
          de,
          (error) => {
            isBoth = false
            errors.push(DE.optionalKeyE(key, error))
          },
          (a) => {
            mut_res[key] = a
          },
          (w, a) => {
            mut_res[key] = a
            errors.push(DE.optionalKeyE(key, w))
          }
        )
      }
      return A.isNonEmpty(errors)
        ? isBoth
          ? Th.Both(DE.recordE(errors), mut_res)
          : Th.Left(DE.recordE(errors))
        : Th.Right(mut_res)
    }
  }
}

export interface RecordD<Codomain> extends CompositionD<UnknownRecordUD, FromRecordD<Codomain>> {}
export function record<Codomain extends AnyUD>(codomain: Codomain): RecordD<Codomain>
export function record(codomain: AnyUD): RecordD<typeof codomain> {
  return compose_(UnknownRecord, fromRecord(codomain))
}

/*
 * -------------------------------------------
 * union
 * -------------------------------------------
 */

export interface UnionD<Members extends ReadonlyArray<AnyD>>
  extends Decoder<
    InputOf<Members[keyof Members]>,
    DE.UnionE<{ [K in keyof Members]: DE.MemberE<CastToNumber<K>, ErrorOf<Members[K]>> }[number]>,
    TypeOf<Members[keyof Members]>
  > {
  readonly _tag: 'UnionD'
  readonly members: Members
}
export function union<Members extends readonly [AnyD, ...ReadonlyArray<AnyD>]>(...members: Members): UnionD<Members> {
  const label = pipe(
    members,
    A.map((d) => d.label),
    A.join(' | ')
  )
  return {
    _tag: 'UnionD',
    label,
    members,
    decode: (i) => {
      const errors: Array<DE.MemberE<number, any>> = [] as any

      let res: any
      let isBoth = false
      for (let index = 0; index < members.length; index++) {
        const de = members[index].decode(i)
        if (Th.isRight(de)) {
          res = de.right
          break
        } else if (Th.isBoth(de)) {
          isBoth = true
          res    = de.right
          errors.push(DE.memberE(index, de.left))
          break
        } else {
          errors.push(DE.memberE(index, de.left))
        }
      }
      return A.isNonEmpty(errors)
        ? isBoth
          ? Th.Both(DE.unionE(errors), res)
          : Th.Left(DE.unionE(errors))
        : Th.Right(res)
    }
  }
}

/*
 * -------------------------------------------
 * intersection
 * -------------------------------------------
 */

export interface IntersectD<Members extends ReadonlyArray<AnyD>>
  extends Decoder<
    UnionToIntersection<{ [K in keyof Members]: InputOf<Members[K]> }[number]>,
    DE.IntersectionE<{ [K in keyof Members]: DE.MemberE<CastToNumber<K>, ErrorOf<Members[K]>> }[number]>,
    UnionToIntersection<{ [K in keyof Members]: TypeOf<Members[K]> }[number]>
  > {
  readonly _tag: 'IntersectD'
  readonly members: Members
}
export function intersect<Members extends NonEmptyArray<Decoder<any, any, Intersectable>>>(
  ...members: Members
): IntersectD<Members> {
  const label = pipe(
    members,
    A.map((d) => d.label),
    A.join(' & ')
  )
  return {
    _tag: 'IntersectD',
    label,
    members,
    decode: (i) => {
      const errors: Array<DE.MemberE<number, any>> = [] as any

      let res    = {} as any
      let isBoth = true
      for (let index = 0; index < members.length; index++) {
        const de = members[index].decode(i)
        Th.match_(
          de,
          (error) => {
            isBoth = false
            errors.push(DE.memberE(index, error))
          },
          (a) => {
            res = _intersect(res, a)
          },
          (w, a) => {
            res = _intersect(res, a)
            errors.push(DE.memberE(index, w))
          }
        )
      }
      const error = A.isNonEmpty(errors) ? DE.pruneDifference(errors) : null
      return error ? (isBoth ? Th.Both(error, res) : Th.Left(error)) : Th.Right(res)
    }
  }
}

/*
 * -------------------------------------------
 * lazy
 * -------------------------------------------
 */

export interface LazyD<D> extends Decoder<InputOf<D>, DE.LazyE<ErrorOf<D>>, TypeOf<D>> {
  readonly _tag: 'LazyD'
  readonly id: string
  readonly decoder: Lazy<D>
}
export function lazy<D extends AnyD>(id: string, decoder: () => D): LazyD<D> {
  const get = memoize<void, Decoder<InputOf<D>, ErrorOf<D>, TypeOf<D>>>(decoder)
  return {
    _tag: 'LazyD',
    label: id,
    id,
    decoder,
    decode: (i) =>
      pipe(
        get().decode(i),
        Th.mapLeft((error) => DE.lazyE(id, error))
      )
  }
}

/*
 * -------------------------------------------
 * sum
 * -------------------------------------------
 */

type EnsureTag<T extends string, Members extends Record<string, AnyD>> = EnforceNonEmptyRecord<Members> &
  {
    [K in keyof Members]: Decoder<any, any, { [tag in T]: K }>
  }

export interface FromSumD<T extends string, Members extends Record<string, AnyD>>
  extends Decoder<
    InputOf<Members[keyof Members]>,
    | DE.TagNotFoundE<T, DE.LiteralE<keyof Members>>
    | DE.SumE<{ [K in keyof Members]: DE.MemberE<K, ErrorOf<Members[K]>> }[keyof Members]>,
    TypeOf<Members[keyof Members]>
  > {
  readonly _tag: 'SumD'
  readonly tag: T
  readonly members: Members
}
export function fromSum<T extends string>(
  tag: T
): <Members extends Record<string, AnyD>>(members: EnsureTag<T, Members>) => FromSumD<T, Members> {
  return (members) => {
    const tags: NonEmptyArray<string> = R.foldl_(members, ([] as unknown) as Mutable<NonEmptyArray<string>>, (b, a) => {
      b.push(...((a as unknown) as FromStructD<any>).properties[tag].literals)
      return b
    })

    const label = pipe(
      members,
      R.foldl([] as string[], (acc, d) => {
        acc.push(d.label)
        return acc
      }),
      A.join(' | ')
    )
    return {
      _tag: 'SumD',
      tag,
      members,
      label,
      decode: (ir) => {
        const v = ir[tag]
        if (v in members) {
          return pipe(
            members[v].decode(ir),
            Th.mapLeft((error) => DE.sumE([DE.memberE(v, error)]))
          )
        }
        return Th.Left(DE.tagNotFoundE(tag, DE.literalE(v, tags)))
      }
    }
  }
}

export interface SumD<T extends string, Members extends Record<string, AnyUD>>
  extends CompositionD<UnknownRecordUD, FromSumD<T, Members>> {}
export function sum<T extends string>(
  tag: T
): <Members extends Record<string, AnyUD>>(members: EnsureTag<T, Members>) => SumD<T, Members>
export function sum(tag: string): (members: Record<string, AnyUD>) => SumD<typeof tag, typeof members> {
  return (members) => compose_(UnknownRecord, fromSum(tag)(members))
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export interface MapD<D extends AnyD, B> extends Decoder<InputOf<D>, ErrorOf<D>, B> {
  readonly _tag: 'MapD'
  readonly decoder: D
  readonly f: (a: TypeOf<D>) => B
}

export function map_<D extends AnyD, B>(decoder: D, f: (a: TypeOf<D>) => B): MapD<D, B>
export function map_<I, E, A, B>(decoder: Decoder<I, E, A>, f: (a: A) => B): Decoder<I, E, B>
export function map_<D extends AnyD, B>(decoder: D, f: (a: TypeOf<D>) => B): MapD<D, B> {
  return {
    _tag: 'MapD',
    decoder,
    f,
    label: decoder.label,
    decode: flow(decoder.decode, Th.map(f))
  }
}

export function map<D extends AnyD, B>(f: (a: TypeOf<D>) => B): (decoder: D) => MapD<D, B> {
  return (decoder) => map_(decoder, f)
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

export interface MapLeftD<D extends AnyD, G> extends Decoder<InputOf<D>, G, TypeOf<D>> {
  readonly _tag: 'MapLeftD'
  readonly decoder: D
  readonly f: (e: ErrorOf<D>) => G
}

export function mapLeft_<D extends AnyD, G>(decoder: D, f: (e: ErrorOf<D>) => G): MapLeftD<D, G>
export function mapLeft_<I, E, A, E1>(decoder: Decoder<I, E, A>, f: (e: E) => E1): Decoder<I, E1, A>
export function mapLeft_<D extends AnyD, G>(decoder: D, f: (e: ErrorOf<D>) => G): MapLeftD<D, G> {
  return {
    _tag: 'MapLeftD',
    decoder,
    f,
    label: decoder.label,
    decode: flow(decoder.decode, Th.mapLeft(f))
  }
}

export function mapLeft<D extends AnyD, G>(f: (e: ErrorOf<D>) => G): (decoder: D) => MapLeftD<D, G> {
  return (decoder) => mapLeft_(decoder, f)
}

/*
 * -------------------------------------------
 * composition
 * -------------------------------------------
 */

export interface CompositionD<From, To>
  extends Decoder<InputOf<From>, DE.CompositionE<ErrorOf<From> | ErrorOf<To>>, TypeOf<To>> {
  readonly _tag: 'CompositionD'
  readonly from: From
  readonly to: To
}

export function compose_<From extends Decoder<any, any, any>, To extends Decoder<TypeOf<From>, any, any>>(
  from: From,
  to: To
): CompositionD<From, To>
export function compose_<I, E, A, E1, B>(
  ia: Decoder<I, E, A>,
  ab: Decoder<A, E1, B>
): Decoder<I, DE.CompositionE<E | E1>, B>
export function compose_<From extends Decoder<any, any, any>, To extends Decoder<TypeOf<From>, any, any>>(
  from: From,
  to: To
): CompositionD<From, To> {
  return {
    _tag: 'CompositionD',
    label: `${from.label} >>> ${to.label}`,
    from,
    to,
    decode: flow(
      from.decode,
      Th.match(
        (e1) => Th.Left(DE.compositionE([e1])),
        (a) =>
          pipe(
            to.decode(a),
            Th.mapLeft((e) => DE.compositionE([e]))
          ),
        (w1, a) =>
          pipe(
            to.decode(a),
            Th.match(
              (e2) => Th.Left(DE.compositionE([w1, e2])),
              (b) => Th.Both(DE.compositionE([w1]), b),
              (w2, b) => Th.Both(DE.compositionE([w1, w2]), b)
            )
          )
      )
    )
  }
}

export function compose<From extends Decoder<any, any, any>, To extends Decoder<TypeOf<From>, any, any>>(
  ab: To
): (ia: From) => CompositionD<From, To>
export function compose<A, E1, B>(
  ab: Decoder<A, E1, B>
): <I, E>(ia: Decoder<I, E, A>) => Decoder<I, DE.CompositionE<E | E1>, B>
export function compose<From extends Decoder<any, any, any>, To extends Decoder<TypeOf<From>, any, any>>(
  ab: To
): (ia: From) => CompositionD<From, To> {
  return (ia) => compose_(ia, ab)
}

export interface IdD<A> extends Decoder<A, never, A> {
  readonly _tag: 'IdD'
}

export function id<A>(): IdD<A>
export function id<A>(): Decoder<A, never, A>
export function id<A>(): IdD<A> {
  return {
    _tag: 'IdD',
    label: 'id',
    decode: Th.Right
  }
}

/*
 * -------------------------------------------
 * reflection
 * -------------------------------------------
 */

export type ConcreteDecoder =
  | stringUD
  | numberUD
  | booleanUD
  | bigintFromStringUD
  | UnknownArrayUD
  | UnknownRecordUD
  | FromRefinementD<any, any, any, any>
  | FromParserD<any, any, any>
  | FromStructD<Record<string, AnyD>>
  | FromPartialD<Record<string, AnyD>>
  | FromArrayD<AnyD>
  | FromTupleD<AnyD[]>
  | UnionD<AnyD[]>
  | IntersectD<AnyD[]>
  | LazyD<AnyD>
  | NullableD<AnyD>
  | OptionalD<AnyD>
  | CompositionD<AnyD, AnyD>
  | SumD<string, Record<string, AnyUD>>
  | MapD<AnyD, any>
  | MapLeftD<AnyD, any>

/**
 * @optimize identity
 */
function asConcrete(d: AnyD): ConcreteDecoder {
  return d as any
}

function keyOfEval<D extends AnyD>(decoder: D): Ev.Eval<ReadonlyArray<RoseTree<string | number>>> {
  const d = asConcrete(decoder)
  switch (d._tag) {
    case 'CompositionD': {
      return Ev.defer(() => pipe(keyOfEval(d.from), Ev.crossWith(keyOfEval(d.to), A.concat_)))
    }
    case 'FromPartialD':
    case 'FromStructD': {
      return pipe(
        d.properties,
        R.traverse(Ev.Applicative)((d: AnyD) => Ev.defer(() => keyOfEval(d))),
        Ev.map(
          R.ifoldl([] as Array<RoseTree<string | number>>, (b, k, a) => {
            b.push(RT.make(k, a))
            return b
          })
        )
      )
    }
    case 'FromTupleD': {
      return pipe(
        d.components,
        A.traverse(Ev.Applicative)((d: AnyD) => Ev.defer(() => keyOfEval(d))),
        Ev.map(
          A.ifoldl([] as Array<RoseTree<string | number>>, (b, i, a) => {
            b.push(RT.make(i, a))
            return b
          })
        )
      )
    }
    case 'IntersectD':
    case 'UnionD': {
      return pipe(
        d.members,
        A.traverse(Ev.Applicative)((d: AnyD) => Ev.defer(() => keyOfEval(d))),
        Ev.map(A.flatten)
      )
    }
    case 'NullableD':
    case 'OptionalD': {
      return Ev.defer(() => keyOfEval(d.or))
    }
    default: {
      return Ev.now([])
    }
  }
}

export function keyOf<D extends AnyD>(decoder: D): ReadonlyArray<RoseTree<string | number>> {
  return keyOfEval(decoder).value
}

export type Pick<D, Prop extends PropertyKey> = D extends FromStructD<infer P>
  ? Prop extends keyof P
    ? P[Prop]
    : never
  : D extends StructD<infer P>
  ? Prop extends keyof P
    ? P[Prop]
    : never
  : D extends FromPartialD<infer P>
  ? Prop extends keyof P
    ? P[Prop]
    : never
  : D extends PartialD<infer P>
  ? Prop extends keyof P
    ? P[Prop]
    : never
  : D extends IntersectD<infer Ds>
  ? { [K in keyof Ds]: Pick<Ds[K], Prop> }[number]
  : D extends UnionD<infer Ds>
  ? { [K in keyof Ds]: Pick<Ds[K], Prop> }[number]
  : D extends Decoder<infer I, infer E, infer A>
  ? Prop extends keyof A
    ? Prop extends keyof I
      ? Decoder<I[Prop], E, A[Prop]>
      : unknown extends I
      ? UDecoder<E, A[Prop]>
      : never
    : never
  : never

export function pick_<D extends AnyD, Prop extends keyof TypeOf<D>>(decoder: D, prop: Prop): FSync<void, Pick<D, Prop>>
export function pick_(decoder: AnyD, prop: string): FSync<void, AnyD> {
  return S.deferTotal(() => {
    const d = asConcrete(decoder)
    switch (d._tag) {
      case 'FromStructD':
      case 'FromPartialD': {
        return prop in d.properties ? S.succeed(d.properties[prop]) : S.fail(undefined)
      }
      case 'UnionD':
      case 'IntersectD': {
        return pipe(
          d.members,
          S.foreach((d: AnyD) =>
            S.matchM_(
              pick_(d, prop),
              (_) => S.unit(),
              (a: AnyD) => S.succeed(a)
            )
          ),
          S.map(A.filter((a): a is AnyD => a !== undefined)),
          S.bind((as) => (as.length === 0 ? S.fail(undefined) : S.succeed(as[0])))
        )
      }
      case 'LazyD': {
        return pick_(d.decoder() as AnyD, prop)
      }
      case 'CompositionD': {
        return pick_(d.to as AnyD, prop)
      }
      default: {
        return S.fail(undefined)
      }
    }
  })
}

export function pick<D extends AnyD, Prop extends keyof TypeOf<D>>(
  prop: Prop
): (decoder: D) => FSync<void, Pick<D, Prop>> {
  return (decoder) => pick_(decoder, prop)
}

/*
 * -------------------------------------------
 * utils
 * -------------------------------------------
 */

/**
 * Converts all warnings into errors
 */
export function condemn<D extends AnyD>(decoder: D): D {
  return {
    ...decoder,
    decode: (i) => {
      const de = decoder.decode(i)
      return Th.isBoth(de) ? Th.Left(de.left) : de
    }
  }
}

export interface LabeledD<D extends AnyD> extends Decoder<InputOf<D>, DE.LabeledE<ErrorOf<D>>, TypeOf<D>> {
  readonly _tag: 'LabeledD'
  readonly decoder: D
}

export function withLabel<D extends AnyD>(decoder: D): LabeledD<D> {
  return {
    _tag: 'LabeledD',
    decoder,
    label: decoder.label,
    decode: flow(
      decoder.decode,
      Th.mapLeft((error) => DE.labeledE(decoder.label, error))
    )
  }
}

export interface MessageD<D extends AnyD> extends Decoder<InputOf<D>, DE.MessageE<ErrorOf<D>>, TypeOf<D>> {
  readonly _tag: 'MessageD'
  readonly decoder: D
  readonly message: string
}

export function withMessage_<D extends AnyD>(decoder: D, message: string): MessageD<D> {
  return {
    _tag: 'MessageD',
    message,
    decoder,
    label: decoder.label,
    decode: flow(
      decoder.decode,
      Th.mapLeft((error) => DE.messageE(message, error))
    )
  }
}

export function withMessage(message: string): <D extends AnyD>(decoder: D) => MessageD<D> {
  return (decoder) => withMessage_(decoder, message)
}

/*
 * -------------------------------------------
 * instances
 * -------------------------------------------
 */

type URI = [HKT.URI<DecoderURI>]

export const Functor = P.Functor<URI, V>({ map_ })

export const Bifunctor = P.Bifunctor<URI, V>({ mapRight_: map_, mapLeft_ })

export const Category = HKT.instance<P.Category<[HKT.URI<DecoderURI>], V>>({
  compose_,
  compose,
  id
})

export { DecoderURI }
